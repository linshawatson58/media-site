// Pulls your public Letterboxd diary from the RSS feed and merges it into
// site/data/films.json. The feed only shows ~50 recent entries, so we keep
// every entry we've ever seen (the archive grows over time).
//
// Tip: seed the archive once with your full export (letterboxd.com/settings/data)
// via:  node scripts/import-letterboxd-export.mjs path/to/diary.csv
import { readFile } from 'node:fs/promises';
import { dataPath, readJson, writeJson, tag, stripHtml } from './lib.mjs';

const USER = process.env.LETTERBOXD_USER || 'meen_achar';
const FEED = `https://letterboxd.com/${USER}/rss/`;

export function parseFeed(xml) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return items
    .map((block) => {
      const title = tag(block, 'letterboxd:filmTitle');
      if (!title) return null; // list entries etc.
      const desc = tag(block, 'description');
      const poster = (desc.match(/<img[^>]+src="([^"]+)"/) || [])[1] || '';
      const rating = parseFloat(tag(block, 'letterboxd:memberRating'));
      const review = stripHtml(desc.replace(/<p><img[^>]*><\/p>/, ''));
      return {
        id: tag(block, 'guid'),
        title,
        year: Number(tag(block, 'letterboxd:filmYear')) || null,
        rating: Number.isFinite(rating) ? rating : null,
        watched: tag(block, 'letterboxd:watchedDate') || null,
        rewatch: tag(block, 'letterboxd:rewatch') === 'Yes',
        poster,
        review: /^Watched on /i.test(review) ? '' : review,
        url: tag(block, 'link'),
      };
    })
    .filter(Boolean);
}

async function main() {
  let xml;
  if (process.env.LETTERBOXD_RSS_FILE) {
    xml = await readFile(process.env.LETTERBOXD_RSS_FILE, 'utf8'); // for testing
  } else {
    const res = await fetch(FEED, { headers: { 'user-agent': 'personal-media-site/1.0' } });
    if (!res.ok) throw new Error(`Letterboxd feed returned ${res.status}`);
    xml = await res.text();
  }

  const fresh = parseFeed(xml);
  const path = dataPath('films.json');
  const existing = await readJson(path, { items: [] });
  // Drop sample data the first time real data arrives.
  const kept = existing.sample ? [] : existing.items;

  const byId = new Map(kept.map((f) => [f.id, f]));
  for (const f of fresh) byId.set(f.id, { ...byId.get(f.id), ...f });

  const items = [...byId.values()].sort((a, b) =>
    String(b.watched || '').localeCompare(String(a.watched || '')),
  );
  await writeJson(path, { updatedAt: new Date().toISOString(), user: USER, items });
  console.log(`letterboxd: ${fresh.length} in feed, ${items.length} in archive`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error('letterboxd: FAILED -', e.message);
    process.exitCode = 1;
  });
}

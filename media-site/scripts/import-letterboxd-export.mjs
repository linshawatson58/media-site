// Seeds site/data/films.json from your full Letterboxd export
// (letterboxd.com/settings/data -> unzip -> diary.csv).
//   node scripts/import-letterboxd-export.mjs path/to/diary.csv
import { readFile } from 'node:fs/promises';
import { dataPath, readJson, writeJson, parseCsv } from './lib.mjs';

const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/import-letterboxd-export.mjs <diary.csv>'); process.exit(1); }

const [header, ...rows] = parseCsv(await readFile(file, 'utf8'));
const col = (n) => header.findIndex((h) => h.trim().toLowerCase() === n.toLowerCase());
const i = { name: col('Name'), year: col('Year'), uri: col('Letterboxd URI'), rating: col('Rating'),
  rewatch: col('Rewatch'), watched: col('Watched Date'), date: col('Date') };

const existing = await readJson(dataPath('films.json'), { items: [] });
const byId = new Map((existing.sample ? [] : existing.items).map((f) => [f.id, f]));
for (const r of rows) {
  const watched = r[i.watched] || r[i.date] || null;
  const id = `export:${r[i.uri]}:${watched}`;
  const alreadyThere = [...byId.values()].some(
    (f) => f.title === r[i.name] && f.year === (Number(r[i.year]) || null) && f.watched === watched,
  );
  if (alreadyThere) continue;
  byId.set(id, {
    id, title: r[i.name], year: Number(r[i.year]) || null,
    rating: parseFloat(r[i.rating]) || null, watched,
    rewatch: r[i.rewatch] === 'Yes', poster: '', review: '', url: r[i.uri],
  });
}
const items = [...byId.values()].sort((a, b) => String(b.watched || '').localeCompare(String(a.watched || '')));
await writeJson(dataPath('films.json'), { updatedAt: new Date().toISOString(), items });
console.log(`films: ${items.length} in archive`);

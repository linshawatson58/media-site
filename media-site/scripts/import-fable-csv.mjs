// Converts a Goodreads-style CSV (what the ShelfBridge Chrome extension makes
// from your Fable library) into site/data/books.json.
//   node scripts/import-fable-csv.mjs path/to/goodreads_import.csv
import { readFile } from 'node:fs/promises';
import { dataPath, writeJson, parseCsv } from './lib.mjs';

const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/import-fable-csv.mjs <file.csv>'); process.exit(1); }

const [header, ...rows] = parseCsv(await readFile(file, 'utf8'));
const col = (name) => header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
const idx = {
  title: col('Title'), author: col('Author'), rating: col('My Rating'),
  read: col('Date Read'), shelf: col('Exclusive Shelf'), review: col('My Review'),
};
const statusOf = (s) => ({ read: 'finished', 'currently-reading': 'reading', 'to-read': 'want' }[s] || s || 'want');

const items = rows
  .map((r) => ({
    title: r[idx.title]?.trim(),
    author: r[idx.author]?.trim(),
    rating: Number(r[idx.rating]) || null,
    finished: (r[idx.read] || '').replaceAll('/', '-').trim() || null,
    status: statusOf((r[idx.shelf] || '').trim()),
    review: (r[idx.review] || '').trim(),
  }))
  .filter((b) => b.title)
  .sort((a, b) => String(b.finished || '').localeCompare(String(a.finished || '')));

await writeJson(dataPath('books.json'), { updatedAt: new Date().toISOString(), source: 'fable', items });
console.log(`books: wrote ${items.length} books`);

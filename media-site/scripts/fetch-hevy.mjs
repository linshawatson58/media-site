// Pulls your recent workouts from the Hevy API (needs Hevy Pro + HEVY_API_KEY).
// Key: hevy.com/settings?developer
import { dataPath, readJson, writeJson } from './lib.mjs';

const KEY = process.env.HEVY_API_KEY;
const BASE = 'https://api.hevyapp.com/v1';

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'api-key': KEY, accept: 'application/json' } });
  if (!res.ok) throw new Error(`Hevy ${path} returned ${res.status}`);
  return res.json();
}

function summarise(w) {
  const exercises = (w.exercises || []).map((e) => e.title);
  let volume = 0;
  let sets = 0;
  for (const e of w.exercises || []) {
    for (const s of e.sets || []) {
      if (s.type === 'warmup') continue;
      sets += 1;
      volume += (s.weight_kg || 0) * (s.reps || 0);
    }
  }
  const start = w.start_time ? new Date(w.start_time) : null;
  const end = w.end_time ? new Date(w.end_time) : null;
  return {
    id: w.id,
    title: w.title,
    date: start ? start.toISOString() : null,
    minutes: start && end ? Math.round((end - start) / 60000) : null,
    exercises,
    sets,
    volumeKg: Math.round(volume),
  };
}

async function main() {
  if (!KEY) {
    console.log('hevy: HEVY_API_KEY not set, skipping (existing data kept)');
    return;
  }
  const count = await get('/workouts/count');
  const pages = [];
  for (let page = 1; page <= 2; page++) {
    const r = await get(`/workouts?page=${page}&pageSize=10`);
    pages.push(...(r.workouts || []));
    if (page >= (r.page_count || 1)) break;
  }
  const items = pages.map(summarise);
  const prev = await readJson(dataPath('workouts.json'), {});
  await writeJson(dataPath('workouts.json'), {
    updatedAt: new Date().toISOString(),
    total: count.workout_count ?? prev.total ?? items.length,
    items,
  });
  console.log(`hevy: ${items.length} recent workouts, ${count.workout_count} total`);
}

main().catch((e) => {
  console.error('hevy: FAILED -', e.message);
  process.exitCode = 1;
});

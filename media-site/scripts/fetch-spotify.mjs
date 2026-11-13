// Pulls recent plays + top tracks/artists from Spotify.
// Needs SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN
// (get the refresh token once with: node scripts/spotify-login.mjs)
//
// Note: Spotify only returns your last ~50 plays, so we keep a rolling archive
// of everything we've seen across runs.
import { dataPath, readJson, writeJson } from './lib.mjs';

const { SPOTIFY_CLIENT_ID: ID, SPOTIFY_CLIENT_SECRET: SECRET, SPOTIFY_REFRESH_TOKEN: REFRESH } = process.env;

async function accessToken() {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      authorization: 'Basic ' + Buffer.from(`${ID}:${SECRET}`).toString('base64'),
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: REFRESH }),
  });
  if (!res.ok) throw new Error(`token refresh returned ${res.status}`);
  return (await res.json()).access_token;
}

const track = (t) => ({
  name: t.name,
  artists: (t.artists || []).map((a) => a.name).join(', '),
  album: t.album?.name || '',
  image: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || '',
  url: t.external_urls?.spotify || '',
});

async function main() {
  if (!ID || !SECRET || !REFRESH) {
    console.log('spotify: credentials not set, skipping (existing data kept)');
    return;
  }
  const token = await accessToken();
  const get = async (path) => {
    const res = await fetch(`https://api.spotify.com/v1${path}`, { headers: { authorization: `Bearer ${token}` } });
    if (res.status === 204) return {};
    if (!res.ok) throw new Error(`Spotify ${path} returned ${res.status}`);
    return res.json();
  };

  const recent = await get('/me/player/recently-played?limit=50');
  const ranges = { short: 'short_term', medium: 'medium_term', long: 'long_term' };
  const topTracks = {};
  const topArtists = {};
  for (const [key, range] of Object.entries(ranges)) {
    const t = await get(`/me/top/tracks?time_range=${range}&limit=10`);
    topTracks[key] = (t.items || []).map(track);
    const a = await get(`/me/top/artists?time_range=${range}&limit=10`);
    topArtists[key] = (a.items || []).map((x) => ({
      name: x.name,
      image: x.images?.[1]?.url || x.images?.[0]?.url || '',
      url: x.external_urls?.spotify || '',
    }));
  }

  const prev = await readJson(dataPath('spotify.json'), {});
  const seen = new Map((prev.sample ? [] : prev.history || []).map((p) => [p.playedAt + p.name, p]));
  for (const i of recent.items || []) {
    const p = { playedAt: i.played_at, ...track(i.track) };
    seen.set(p.playedAt + p.name, p);
  }
  const history = [...seen.values()].sort((a, b) => b.playedAt.localeCompare(a.playedAt)).slice(0, 500);

  await writeJson(dataPath('spotify.json'), {
    updatedAt: new Date().toISOString(),
    recent: history.slice(0, 20),
    history,
    topTracks,
    topArtists,
  });
  console.log(`spotify: ${recent.items?.length || 0} new plays fetched, ${history.length} in archive`);
}

main().catch((e) => {
  console.error('spotify: FAILED -', e.message);
  process.exitCode = 1;
});

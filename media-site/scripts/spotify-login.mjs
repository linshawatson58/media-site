// One-time helper to get a Spotify refresh token.
// 1. Create an app at developer.spotify.com/dashboard
//    Redirect URI: http://127.0.0.1:8888/callback
// 2. Run:  SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... node scripts/spotify-login.mjs
// 3. Open the printed URL, approve, and copy the refresh token it prints.
import http from 'node:http';

const { SPOTIFY_CLIENT_ID: ID, SPOTIFY_CLIENT_SECRET: SECRET } = process.env;
if (!ID || !SECRET) {
  console.error('Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET first.');
  process.exit(1);
}
const redirect = 'http://127.0.0.1:8888/callback';
const scope = 'user-read-recently-played user-top-read';

const url =
  'https://accounts.spotify.com/authorize?' +
  new URLSearchParams({ client_id: ID, response_type: 'code', redirect_uri: redirect, scope });
console.log('\nOpen this in your browser:\n\n' + url + '\n');

http
  .createServer(async (req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1:8888');
    if (u.pathname !== '/callback') return res.end();
    const code = u.searchParams.get('code');
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        authorization: 'Basic ' + Buffer.from(`${ID}:${SECRET}`).toString('base64'),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirect }),
    });
    const body = await r.json();
    res.end('Done. You can close this tab and go back to the terminal.');
    console.log(body.refresh_token ? `SPOTIFY_REFRESH_TOKEN=${body.refresh_token}` : body);
    process.exit(0);
  })
  .listen(8888);

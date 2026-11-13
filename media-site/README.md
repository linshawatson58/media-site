# My media site

One page showing Letterboxd films, Bingers TV, Fable books, Hevy workouts and Spotify music.

| Source | How it updates |
|---|---|
| Letterboxd | Automatic (RSS feed, every 6 hours) |
| Hevy | Automatic (API key) |
| Spotify | Automatic (refresh token) |
| Fable | You re-import a CSV when you want it refreshed |
| Bingers | You edit `site/data/tv.json` by hand (no export exists yet) |

Until the first update runs, every section shows clearly labelled sample data.

## Setup (about 20 minutes, once)

### 1. Put it on GitHub
Create a new repo, push this folder to the `main` branch, then go to
**Settings → Pages → Source: GitHub Actions**.

### 2. Letterboxd (nothing to set up)
The workflow already uses the username `meen_achar`. Your diary must be public, and entries need a watched date to appear in the feed.
The feed only shows about 50 recent entries, so seed your full history once:
download your export at letterboxd.com/settings/data, then run
`node scripts/import-letterboxd-export.mjs path/to/diary.csv` and commit the result.

### 3. Hevy
Hevy → Settings → Developer → generate an API key.
In your repo: **Settings → Secrets and variables → Actions → New repository secret**, name `HEVY_API_KEY`.

### 4. Spotify
1. Create an app at developer.spotify.com/dashboard. Redirect URI: `http://127.0.0.1:8888/callback`.
2. On your computer run:
   `SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node scripts/spotify-login.mjs`
3. Open the printed link, approve, and copy the `SPOTIFY_REFRESH_TOKEN=...` it prints.
4. Add three repo secrets: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`.

Spotify only exposes your last 50 plays, so the site keeps its own growing archive.
Your app owner account must keep Premium or the API stops working.

### 5. Fable (manual)
Fable has no official export. The unofficial route is the ShelfBridge Chrome extension, which makes a Goodreads-style CSV.
Then run `node scripts/import-fable-csv.mjs path/to/goodreads_import.csv` and commit `site/data/books.json`.
It's unofficial, so check the CSV looks right before you commit.

### 6. Bingers (manual)
Edit `site/data/tv.json`. Each show looks like:
`{"title":"Severance","status":"watching","season":2,"episode":4,"rating":null,"date":"2026-11-11"}`
`status` is `watching`, `finished` or `want`. If Bingers adds an export, this can be automated.

## Run it locally
```
node scripts/fetch-letterboxd.mjs
npx serve site
```

## Notes
- Secrets stay in GitHub, never in the page.
- If a source fails, the others still update and the old data stays.
- Hevy's API is marked "v0", so it may change.

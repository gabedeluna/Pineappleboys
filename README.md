# Pineapple Boys

Jungle-themed Next.js (App Router) site for Saitis:
- Current and Future sections share cards styled from the provided guide.
- Auth: single admin login with httpOnly cookie session.
- Cards support lyrics and inline embeds for YouTube, Spotify, and SoundCloud samples.

## Dev setup
1) Install deps: `npm install`
2) Add env vars (see below)
3) Run dev server: `npm run dev`
4) Open http://localhost:3000

### Required env vars
- `ADMIN_USER` – username
- `ADMIN_PASS` – password
- `SESSION_SECRET` – long random string for signing the session cookie

## Deployment
- Ready for Vercel: push to `main`, set env vars above.

## Next steps
- Persist songs/links (Vercel Postgres or KV) and replace mock data in `src/app/page.tsx`.

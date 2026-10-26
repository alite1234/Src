# SRC Legislative Summit Platform

A full-stack live event platform for the SRC Legislative Summit: an admin dashboard for content, a controller dashboard for projection, a full-screen projector, and a phone-based live quiz with realtime scoring.

## Features

- **Admin dashboard** for the active summit, branding, logo uploads, speakers, scenes, quote/scoreboard entries, presentation queue, users, audit log, and quizzes.
- **Controller dashboard** for live scene preview and publishing, previous/next transport, holding and blank screens, countdowns, scoreboard reveals, speaker lookup, queue navigation, and quiz control.
- **Projector** at `/project` with four themes, animated scene types, logo placement and visibility rules, countdowns, quiz lobby, questions, reveals, and leaderboards.
- **Participant quiz** at `/play` with a six-digit PIN, no account required, one answer per question, speed bonuses, live standings, and final results.
- **Realtime updates** through Ably when configured, with automatic polling fallback when it is not.
- **Role-based access** for admins and controllers. Participants use a separate signed cookie session.
- **Neon-ready persistence** for all content, including uploaded images stored in Postgres.

## Requirements

- Node.js 20 or newer
- PostgreSQL 16 (local Docker or Neon)
- An Ably API key (optional; polling is used without one)

## Local setup

```bash
npm install
cp .env.example .env.local
```

Set `DATABASE_URL`, `AUTH_SECRET`, and the four seeded account variables in `.env.local`.

A suitable local database:

```bash
docker run --name summit-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=summit \
  -p 5432:5432 \
  -d postgres:16-alpine
```

Then:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

The seed creates only the configured admin and controller accounts. It deliberately does **not** create an event or demo content.

## Routes

| Route | Purpose | Access |
| --- | --- | --- |
| `/` | Public landing page | Public |
| `/login` | Admin/controller sign-in | Public |
| `/home` | Role-aware landing after sign-in | Authenticated |
| `/admin` | Admin dashboard | Admin |
| `/control` | Live controller dashboard | Admin, controller |
| `/project` | Full-screen projector | Public |
| `/play?pin=123456` | Participant quiz | Public |

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string. Use the pooled Neon string in production. |
| `AUTH_SECRET` | Yes | Auth.js and participant session signing secret. |
| `AUTH_TRUST_HOST` | Production | Set to `true` behind a proxy. |
| `ADMIN_NAME` | Seed | Admin display name. |
| `ADMIN_EMAIL` | Seed | Admin login. |
| `ADMIN_PASSWORD` | Seed | Admin password. |
| `CONTROLLER_NAME` | Seed | Controller display name. |
| `CONTROLLER_EMAIL` | Seed | Controller login. |
| `CONTROLLER_PASSWORD` | Seed | Controller password. |
| `ABLY_API_KEY` | No | Enables realtime. Leave empty to poll. |
| `NEXT_PUBLIC_APP_URL` | Production | Public base URL for links and deployment. |

Generate a secret with:

```bash
openssl rand -base64 32
```

## Event workflow

1. Sign in as an admin and create the summit under **Admin → Summit**.
2. Upload branding and logos, then configure logo visibility.
3. Add speakers, citation details, and photos.
4. Build scenes for openings, speaker introductions, citations, topics, announcements, breaks, closing, and scoreboards.
5. Order scenes in the presentation queue.
6. Add scoreboard entries and quiz questions.
7. Open `/control` to preview/publish scenes and run the programme.
8. Open `/project` on the projector browser.
9. Launch a quiz from the controller; participants join at `/play` with the PIN.
10. Run questions, pause/extend timers, reveal answers, show standings, and end the quiz.

Scene edits do not retroactively change the projector. Publishing stores a snapshot of the scene in `live_state.scene_snapshot` so a live slide stays stable while admin edits continue.

## Architecture notes

- The database is the source of truth. Projector, controller, and participant clients refresh from server-built payloads.
- `useLiveFeed` subscribes to Ably when available and otherwise polls every 1.5–2 seconds.
- `/api/control/state` and `/api/play/state` require their respective sessions. `/api/public/live` is read-only and public.
- Auth is enforced in server layouts and API handlers rather than middleware.
- Participant identity is a 12-hour JWT cookie (`src_play`) scoped to `/`.
- Images are validated, hashed, compressed client-side, and stored as base64 in Postgres; they are served from `/api/files/[id]`.
- Upload limits: PNG/JPEG/WebP, 2.5 MB per file, maximum 5 logos per event.
- Projection stages use container-relative units (`cqw`/`cqh`) so admin/controller previews scale exactly like the projector.
- Quiz scores are stored per response; leaderboard rank is recalculated from score, response time, and the configured tie-breaker.

## Database commands

```bash
npm run db:generate   # generate a migration after schema changes
npm run db:migrate    # apply pending migrations
npm run db:push       # push schema directly (development only)
npm run db:seed       # create/update the configured admin and controller
npm run db:studio     # open Drizzle Studio
```

## Verification

```bash
npm run typecheck
npm run lint
npm run build
```

Before a real event, test on phones, tablets, projector resolutions, and multiple simultaneous participants. Verify reconnect behaviour, logo visibility, role restrictions, and the expected concurrent load.

## Deployment

- Deploy to a Node-capable host such as Vercel.
- Use a Neon pooled `DATABASE_URL` with `sslmode=require`.
- Run migrations against the production database before deploying.
- Set a strong `AUTH_SECRET` and change both seeded passwords.
- Add an Ably key for production realtime. Without it the app still works through polling.
- The public projector URL must remain reachable from the venue network.

## Project structure

```text
src/app/            App Router pages and API routes
src/components/     Admin, controller, projector, play, and UI components
src/lib/data/       Server-side query and payload builders
src/lib/db/         Drizzle schema and client
src/lib/realtime/   Ably server helpers
src/auth.ts         Auth.js configuration
drizzle/            SQL migrations
scripts/            Seed and environment helpers
```

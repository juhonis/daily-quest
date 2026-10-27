# Daily Quest

A calendar, todo, and note-taking app that stores data in your browser — no account, works offline, with optional direct device sync.

**Live demo:** <https://daily-quest-dmt.pages.dev/>

## The original idea: gamification

Daily Quest started as an idea to turn the daily todo list into a game — earn **XP** for completing quests and spend it on **rewards**.

That gamification layer is **not implemented yet** and may never be. The current app is the core foundation: a flexible calendar + quest (todo) + notes app. The data model reserves an optional `xp` field on each quest for a future scoring system, but today there is no XP collection, no levels, no streaks, and no rewards — just the (already useful) task and calendar tooling.

## Features

- **Calendar** — month grid with keyboard navigation; click any date to plan that day; quick "jump to today".
- **Quests (todos)** — create tasks with optional description, external URL, and icon.
  - **Repeat rules** — none, daily, weekly, monthly, or custom intervals (e.g. every 3 days).
  - **Rollover** — carry an incomplete quest forward every day until you finish it (never auto-expires).
  - **Sub-quests** — checklists inside a quest.
  - **Quick-add presets** — one-tap quests like Wordle, NYT Mini, Connections; create your own presets.
  - **Tags** — color-coded tags, tag filtering, and dedicated tag panels.
- **Panel system** — quests are grouped into panels (daily, repeating, important, rollover, done, per-tag). Panels can be shown/hidden, merged, and reordered via drag & drop.
- **Per-day completions** — checking off a quest records it for that specific date only; repeating quests are completed independently each day.
- **Notes** — markdown notes with colors and tags, fully searchable/archivable.
- **Weather** — current conditions, hourly forecast, and a rain radar for the selected date (Open-Meteo + Open-Meteo radar, no API key needed). Uses auto-geolocation or a manual location.
- **Data backup** — export all data as a versioned JSON file and restore it from Settings, with a backup download available before replacement.
- **Device sync** — manually pair two open browsers using a code or QR link and combine changes over encrypted WebRTC. Cloudflare handles temporary pairing; app content stays on your devices. [Setup guide](docs/device-sync.md).
- **PWA / offline** — installable to the home screen, cached service worker, works without a connection.

## How it works

- **Local-first.** App data is stored in your browser's `localStorage` under the key `daily-quest-store`, managed by Zustand with the `persist` middleware. Optional device sync uses a small Cloudflare pairing service and a direct WebRTC connection; no app-content database or user account is needed.
- **Timezone-safe dates.** Everything is stored as plain `YYYY-MM-DD` strings. "Today" is always your local calendar day, so nothing shifts when you travel or cross midnight. All date math lives in `src/utils/dateUtils.ts` using `date-fns`.
- **Data ownership.** Your app data leaves your device only when you export it or explicitly sync with another device. Use Settings to export backups, import data, pair devices, or recover conflicting edits.

## Tech stack

| Layer | Tech |
|---|---|
| UI | React 19, TypeScript, Tailwind CSS v4 |
| Build | Vite 8 |
| State | Zustand 5 (`persist` → `localStorage`) |
| Dates | date-fns |
| Notes | react-markdown, remark-gfm |
| Weather | Open-Meteo, Leaflet |
| PWA | vite-plugin-pwa (service worker) |
| Tests | Vitest |
| Lint | ESLint |

## Local development

```bash
cd client
npm install
npm run dev
```

Open <http://localhost:5173>.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest in watch mode |
| `npm run test:run` | Run Vitest once |

## Deployment

### Cloudflare Pages (production)

The app is a static SPA and is currently deployed to Cloudflare Pages at <https://daily-quest-dmt.pages.dev/>.

To deploy:

1. Configure the GitHub-connected Pages project with root `client`, build command `npm run build`, and output directory `dist`.
2. Deploy the pairing Worker and configure its service binding using the [device sync setup guide](docs/device-sync.md).
3. Push source changes to GitHub. Pages builds the frontend and Functions together and provides the SPA fallback automatically.

### Self-hosting with Docker

#### Production

Build the multi-stage image (Node build → nginx serve, port 80):

```bash
docker build -t daily-quest ./client
docker run -p 8080:80 daily-quest
```

Open <http://localhost:8080>. The nginx config handles SPA routing, the PWA service worker, and long-lived caching for hashed assets.

#### Development (hot reload)

The root `docker-compose.yml` runs the Vite dev server with file watching enabled for container volumes:

```bash
docker compose up
```

Open <http://localhost:5173>.

## Project structure

```
.
├── client/               # The React/Vite SPA (all application code)
│   ├── src/
│   │   ├── components/   # Shared UI and layout components
│   │   ├── features/     # Feature modules: calendar, quests, notes, weather, settings
│   │   ├── store/        # Zustand store (useStore.ts)
│   │   ├── types/        # Global TypeScript types
│   │   └── utils/        # Pure helpers (dateUtils, exportImport, cn)
│   ├── public/           # Static assets, PWA manifest, Functions routing
│   ├── functions/        # Same-origin device pairing API proxy
│   └── Dockerfile        # Production build (nginx) + dev deps target
├── sync-worker/          # Cloudflare pairing Worker + SQLite-backed Durable Object
├── docs/                 # Design and planning documents
└── docker-compose.yml    # Dev compose setup (hot reload)
```

## Testing

```bash
cd client
npm run test:run
```

Tests cover recurring-quest dates, backup validation, causal sync merging, and chunked transfer. Worker runtime tests and real Chromium peer-to-peer tests are documented in [device sync setup](docs/device-sync.md#verification).

## Roadmap

Current plans and rollout status:

- **Gamification** — the original concept: XP accumulation, levels, streak tracking, and a rewards system. The `xp` field is already reserved on quests and surfaced in the UI as metadata, but no game mechanics exist yet.
- **Device sync rollout** — pairing, direct transfer, conflict recovery, and deployment configuration are implemented and locally tested. Cloudflare provisioning and physical two-device acceptance remain deployment steps; see `docs/device-sync.md`. The earlier Firebase proposal has been retired.

See the `docs/` folder for the design history: `plan.md`, `structure-rules.md`, `storage-plan.md`, `weather-plan.md`.

## License

[MIT](LICENSE)

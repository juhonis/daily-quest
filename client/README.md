# Daily Quest — Client

Modern todo/calendar app with lightweight gamification, built with React + Vite + TypeScript + Tailwind v4.

## Local development

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173

## Running with Docker

Dev (with hot reload):
```bash
docker compose up
```

Production build + serve:
```bash
docker build -t daily-quest ./client
docker run -p 8080:80 daily-quest
```

Open http://localhost:8080

## Scripts

- `npm run dev` — start Vite dev server
- `npm run build` — type-check + build for production
- `npm run lint` — run ESLint
- `npm run test` — run Vitest in watch mode
- `npm run test:run` — run Vitest once

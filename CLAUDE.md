# GameForge - Board Game Studio

## Project Overview
Self-hosted clone of a Base44 app (rusevine5.base44.app) for collaborative board game design. Built to remove entry limits from the Base44 free plan.

**Live:** https://gameforge-1-y9s0.onrender.com
**Repo:** https://github.com/tomekmaleni/gameforge

## Tech Stack
- **Frontend:** React 18, Vite, Tailwind CSS, shadcn/ui, React Query, React Router
- **Backend:** Express.js, SQLite (better-sqlite3), multer for uploads
- **Auth:** Email/name based (no passwords), cookie-based sessions

## Architecture
- Generic entity CRUD: single `entities` table with JSON `data` column
- `src/api/base44Client.js` replaces the Base44 SDK, talks to local Express API
- 17 entity types: AppVersion, ChatMessage, Comment, DesignComparison, Folder, GameCategory, GameEntry, Idea, LorePage, Mechanic, MediaItem, PlaytestSession, Project, ProjectMember, Task, TrashItem, VersionHistory
- `server/seed.js` seeds the "Ruševine" board game project data
- POST `/api/seed` endpoint to seed on Render (runs once, skips if data exists)

## Running
- `npm run dev` — starts Express (port 3001) + Vite (port 5173)
- `npm run build && npm start` — production mode on port 3001
- `node server/seed.js` — seed the Ruševine project data

## Render Deployment
- Node 18.x (set in package.json engines)
- Env vars: `NODE_ENV=production`, `NPM_CONFIG_PRODUCTION=false`
- Free tier: no persistent disk, DB resets on redeploy (re-seed via POST /api/seed)
- Auto-deploys on push to master

## Key Files
- `server/index.js` — Express API server
- `server/seed.js` — Database seed script
- `src/App.jsx` — Routes and auth
- `src/components/hooks/useProject.jsx` — Project context provider
- `src/components/layout/ProjectLayout.jsx` — Main layout with sidebar
- `src/pages/` — All 15 page components

## The Game
"Ruševine" is a board game being designed by Tomislav and 5 friends. It features factions (Legija, Gilda, Odred Minulog Sunca, Lovci na Čudovišta, Posljednja Ekspedicija), artifacts, relics, mechanics like Combat, Movement, Healing, etc.

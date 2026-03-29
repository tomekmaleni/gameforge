# GameForge - Board Game Studio

## CRITICAL RULES
- **ALWAYS run `npm run backup` before any git commit/push** — this saves the current database to server/backup.json as a safety net
- The backup workflow is: `npm run backup && git add -A && git commit -m "..." && git push`
- After pushing, deploy to Fly.io with: `fly deploy`

## Project Overview
Self-hosted clone of a Base44 app (rusevine5.base44.app) for collaborative board game design. Built to remove entry limits from the Base44 free plan. The user (Tomislav) and 5 friends collaborate on a board game called "Ruševine".

**Live:** https://gameforge.fly.dev
**Repo:** https://github.com/tomekmaleni/gameforge (branch: master)
**Local path:** C:\Users\tomislav\OneDrive\Documents\gameforge

## Tech Stack
- **Frontend:** React 18, Vite, Tailwind CSS, shadcn/ui, React Query, React Router
- **Backend:** Express.js, SQLite (better-sqlite3), multer for uploads
- **Auth:** Email/name based (no passwords), cookie-based sessions
- **Deployment:** Fly.io with persistent volume (SQLite survives deploys)

## Architecture
- Generic entity CRUD: single `entities` table with JSON `data` column in SQLite
- `src/api/base44Client.js` is a drop-in replacement for the Base44 SDK — all entities go through this client which talks to the Express API
- 17 entity types: AppVersion, ChatMessage, Comment, DesignComparison, Folder, GameCategory, GameEntry, Idea, LorePage, Mechanic, MediaItem, PlaytestSession, Project, ProjectMember, Task, TrashItem, VersionHistory
- The frontend code was ported nearly 1:1 from the original Base44 app screenshots

## Data Persistence
- **Primary:** Fly.io persistent volume mounted at `/data` — SQLite DB survives all deploys and restarts
- Uploaded files are stored in SQLite `files` table as BLOBs AND on disk
- **Backup safety net (GitHub):** auto-backup every 5min (or 30s after changes) pushes backup.json to GitHub via API (requires `GITHUB_TOKEN` env var)
- **Shutdown backup**: SIGTERM/SIGINT handler pushes emergency backup before process dies
- **Manual Save button**: sidebar has "Save Backup" button that triggers `POST /api/backup`
- On server startup, if DB is empty, auto-restores from backup.json (entities, users, AND files)
- `npm run backup` (runs server/export-backup.js) exports live server DB → server/backup.json
- `GET /api/export` downloads full DB as JSON from the live server
- `POST /api/import` imports JSON backup into the database
- `POST /api/backup` triggers immediate backup push to GitHub
- `POST /api/seed` runs seed.js (one-time, only if DB empty)

## Running
- `npm run dev` — starts Express (port 3001) + Vite (port 5173) concurrently
- `npm run build && npm start` — production mode, serves everything on port 3001
- `npm run backup` — export DB to server/backup.json
- `fly deploy` — deploy to Fly.io
- `node server/seed.js` — seed the Ruševine project data from scratch

## Key Files
- `server/index.js` — Express API server (CRUD, auth, upload, export/import, auto-restore)
- `server/seed.js` — Database seed script with all Ruševine data
- `server/backup.json` — Full database snapshot (committed to repo)
- `server/export-backup.js` — Script to export DB to backup.json
- `Dockerfile` — Docker build for Fly.io deployment
- `fly.toml` — Fly.io configuration (persistent volume, Frankfurt region)
- `src/App.jsx` — Routes, auth, login screen
- `src/api/base44Client.js` — API client (replaces Base44 SDK)
- `src/components/hooks/useProject.jsx` — Project context provider (user, role, canEdit)
- `src/components/hooks/useTrashDelete.jsx` — Soft-delete with 30-day trash
- `src/components/layout/ProjectLayout.jsx` — Main layout with sidebar
- `src/components/layout/ProjectSidebar.jsx` — Navigation sidebar
- `src/pages/` — All 15 page components

## Fly.io Deployment
- Docker-based deployment with Node 18
- Persistent volume `gameforge_data` mounted at `/data` (1GB, Frankfurt region)
- Environment variables: `NODE_ENV=production`, `GITHUB_TOKEN=<PAT with repo scope>` (set via `fly secrets`)
- Deploy with: `fly deploy`
- Logs: `fly logs`
- Machines auto-stop when idle, auto-start on request
- Service URL: https://gameforge.fly.dev

## The Game: Ruševine
A board game designed by Tomislav and 5 friends:
- **Members:** Tomislav Matoković (admin, tomekmaleni@gmail.com), Ying Yang (shadowmaster1705@gmail.com), Matkoosymous W (matko.vasovic@gmail.com), Jakov Vehar Kocačić Augustin (jakov.vehar@gmail.com), Vladislav Groza (womir0706@gmail.com), Filip Tomić (f.tomic1801@gmail.com)
- **Invite code:** BX0VBM
- **Factions:** Legija, Gilda, Odred Minulog Sunca, Lovci na Čudovišta, Posljednja Ekspedicija
- **Mechanics:** Block action, Force action, Štit, Uništavanje artefakata, Regrutiranje, Borba s Demonima, Otkrivanje Polja, Pročišćenje, Traženje Relikvija, Predviđanje, Combat, Healing, Movement
- **Categories:** Polja, Zapovjednici, Event, Trofeji, Čudovišta, Relikvije, Artefakti, Frakcije, Blago
- **Folders:** Frakcije, Artefakti, Map, Mechanics, Lore, Dizajn, Čudovišta, Playtesting
- 39 game entries, 11 ideas, 15 media files, 1 task, 1 playtest session, chat messages

## Development History (2026-03-26)

### How this was built
1. User shared the original Base44 app at rusevine5.base44.app — wanted to clone it so friends could use it without Base44's entry limits
2. User shared screenshots of every entity schema (all 17 entities), every page component, every shared component, hooks, layout, sidebar, and the API client
3. I built the full app from scratch:
   - Scaffolded Vite + React + Tailwind + Express + SQLite project
   - Created `src/api/base44Client.js` as a drop-in replacement for the @base44/sdk — same interface (entities.X.create/filter/update/delete/list, auth.me, integrations.Core.UploadFile)
   - Wrote all 13 shadcn/ui components
   - Wrote all 5 shared components (DeleteConfirmDialog, CommentsSection, ImageCropEditor, TagInput, AppVersionWatcher)
   - Wrote all 6 component files (FolderChat, FolderMedia, useProject, useTrashDelete, ProjectLayout, ProjectSidebar)
   - Wrote all 15 page components
   - Built Express server with generic entity CRUD, cookie auth, multer uploads
   - Added login screen (name + email, no password)
4. Replaced ReactQuill with plain Textarea in LoreWiki (avoids dependency issues)
5. Created GitHub repo at tomekmaleni/gameforge and pushed

### Migration to Fly.io (2026-03-29)
- Moved from Render.com free tier (ephemeral filesystem, DB wiped on every deploy) to Fly.io with persistent volume
- Fixed critical bug: `/api/export` was not including entity IDs, causing data loss on restore
- Fixed emergency backup to always save on shutdown
- Reduced auto-backup interval from 15min to 5min, debounce from 2min to 30s

### Known Limitations
- Images from original Base44 app weren't migrated (hosted on Base44's CDN) — user would need to re-upload them
- No WebSocket real-time updates (chat uses 3-second polling instead of Base44's subscribe)
- LoreWiki uses plain Textarea instead of ReactQuill rich text editor
- Fly.io free tier: machines auto-stop when idle, cold start on first request

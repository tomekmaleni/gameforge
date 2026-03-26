# GameForge - Board Game Studio

## CRITICAL RULES
- **ALWAYS run `npm run backup` before any git commit/push** — this saves the current database to server/backup.json so data isn't lost on Render redeploy
- The backup workflow is: `npm run backup && git add -A && git commit -m "..." && git push`

## Project Overview
Self-hosted clone of a Base44 app (rusevine5.base44.app) for collaborative board game design. Built to remove entry limits from the Base44 free plan. The user (Tomislav) and 5 friends collaborate on a board game called "Ruševine".

**Live:** https://gameforge-1-y9s0.onrender.com
**Repo:** https://github.com/tomekmaleni/gameforge (branch: master)
**Local path:** C:\Users\tomislav\OneDrive\Documents\gameforge

## Tech Stack
- **Frontend:** React 18, Vite, Tailwind CSS, shadcn/ui, React Query, React Router
- **Backend:** Express.js, SQLite (better-sqlite3), multer for uploads
- **Auth:** Email/name based (no passwords), cookie-based sessions
- **Deployment:** Render.com free tier, auto-deploys on push to master

## Architecture
- Generic entity CRUD: single `entities` table with JSON `data` column in SQLite
- `src/api/base44Client.js` is a drop-in replacement for the Base44 SDK — all entities go through this client which talks to the Express API
- 17 entity types: AppVersion, ChatMessage, Comment, DesignComparison, Folder, GameCategory, GameEntry, Idea, LorePage, Mechanic, MediaItem, PlaytestSession, Project, ProjectMember, Task, TrashItem, VersionHistory
- The frontend code was ported nearly 1:1 from the original Base44 app screenshots

## Data Persistence
- Render free tier has NO persistent disk — DB resets on every redeploy
- `server/backup.json` is committed to the repo with full database snapshot
- On server startup, if DB is empty, auto-restores from backup.json
- `npm run backup` (runs server/export-backup.js) exports local DB → server/backup.json
- `GET /api/export` downloads full DB as JSON from the live server
- `POST /api/import` imports JSON backup into the database
- `POST /api/seed` runs seed.js (one-time, only if DB empty)

## Running
- `npm run dev` — starts Express (port 3001) + Vite (port 5173) concurrently
- `npm run build && npm start` — production mode, serves everything on port 3001
- `npm run backup` — export DB to server/backup.json (DO THIS BEFORE EVERY PUSH)
- `node server/seed.js` — seed the Ruševine project data from scratch

## Key Files
- `server/index.js` — Express API server (CRUD, auth, upload, export/import, auto-restore)
- `server/seed.js` — Database seed script with all Ruševine data
- `server/backup.json` — Full database snapshot (committed to repo)
- `server/export-backup.js` — Script to export DB to backup.json
- `src/App.jsx` — Routes, auth, login screen
- `src/api/base44Client.js` — API client (replaces Base44 SDK)
- `src/components/hooks/useProject.jsx` — Project context provider (user, role, canEdit)
- `src/components/hooks/useTrashDelete.jsx` — Soft-delete with 30-day trash
- `src/components/layout/ProjectLayout.jsx` — Main layout with sidebar
- `src/components/layout/ProjectSidebar.jsx` — Navigation sidebar
- `src/pages/` — All 15 page components

## Render Deployment
- Node 18.x (set in package.json engines)
- Environment variables: `NODE_ENV=production`, `NPM_CONFIG_PRODUCTION=false`
- render.yaml configures the service
- Auto-deploys on push to master
- Free tier sleeps after 15min, ~30s cold start
- Service URL: https://gameforge-1-y9s0.onrender.com

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

### Render deployment issues & fixes
- First deploy failed: Node 22 (Render default) had issues with better-sqlite3 → fixed by adding `"engines": {"node": "18.x"}` to package.json
- Second deploy failed: `vite: not found` → Render only installs production deps by default → fixed by adding `NPM_CONFIG_PRODUCTION=false` env var
- Third deploy succeeded

### Data migration attempts
- Tried 3 different browser console scripts to export data from Base44 API — all returned empty arrays (Base44 blocks direct API access)
- User provided comprehensive screenshots of every section of the Ruševine project
- I created server/seed.js from the screenshots with all 39 entries, 13 mechanics, 11 ideas, etc.
- Later added server/backup.json approach for persistence across Render redeploys

### Known Limitations
- Images from original Base44 app weren't migrated (hosted on Base44's CDN) — user would need to re-upload them
- No WebSocket real-time updates (chat uses 3-second polling instead of Base44's subscribe)
- LoreWiki uses plain Textarea instead of ReactQuill rich text editor
- Render free tier: ~30s cold start after 15min inactivity
- Uploaded files on Render are lost on redeploy (only SQLite data is backed up via backup.json)

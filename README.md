# GameForge - Board Game Studio

A collaborative board game design workspace where teams can organize game assets, brainstorm ideas, and track development progress together.

## Join Online

**The app is live at: https://gameforge-1-y9s0.onrender.com**

1. Open the link above
2. Enter your name and email (no password needed)
3. Create a new project or join an existing one with an invite code
4. Share the invite code with your friends so they can join too

> The free server sleeps after 15 min of inactivity. The first load after sleep takes ~30 seconds — just wait for it.

## Features

- **Projects** with invite codes for team collaboration
- **Folders** with real-time chat and media attachments
- **Game Database** with custom categories, dynamic fields, mechanics linking, and tags
- **Media Library** with image uploads and crop editor
- **Lore Wiki** for world-building documentation
- **Idea Backlog** with like/dislike voting and feedback
- **Task Board** (Kanban-style) with priority and assignees
- **Playtesting Logger** that auto-creates tasks from session issues
- **Design Votes** for comparing design options with team voting
- **Search** across all content types
- **Member Roles** (admin / editor / viewer)
- **Trash** with 30-day soft-delete and restore
- **Comments** on database entries, media, wiki pages, and ideas

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui, React Query, React Router
- **Backend**: Express.js, SQLite (better-sqlite3)
- **Auth**: Simple email/name based (no passwords)

## Run Locally

```bash
# Install dependencies
npm install

# Start both frontend and backend
npm run dev
```

This launches:
- Vite dev server at `http://localhost:5173`
- Express API server at `http://localhost:3001`

Open `http://localhost:5173` in your browser, enter your name and email, and create your first project.

## Production Build (Local)

```bash
npm run build
npm start
```

This builds the frontend and serves everything from the Express server on port 3001.

## Data Persistence

All data (entities, users, and uploaded files) is fully persistent across Render redeploys through multiple safety layers:

1. **Database storage** — uploaded files are stored in SQLite alongside entity data (not just on disk)
2. **Auto-backup to GitHub** — the server automatically pushes `backup.json` to the repo every 15 minutes (or 2 min after any change) via the GitHub API
3. **Shutdown backup** — on server shutdown (SIGTERM), an emergency backup is pushed to GitHub
4. **Pre-push hook** — `npm run backup` runs automatically before every `git push`
5. **Manual Save button** — click "Save Backup" in the sidebar to trigger an immediate backup

On startup, if the database is empty, the server auto-restores everything from `backup.json` — including uploaded images.

**Required env var on Render:** `GITHUB_TOKEN` (GitHub Personal Access Token with `repo` scope) to enable auto-backup.

**API endpoints for data management:**
- `GET /api/export` — download the full database as JSON
- `POST /api/import` — import a JSON backup into the database
- `POST /api/backup` — trigger an immediate backup to GitHub

## Self-Host on Render.com (Free)

1. Fork this repo to your GitHub account
2. Go to [render.com](https://render.com) and sign up with GitHub
3. Click **New +** → **Web Service**, connect the repo
4. Set **Build Command**: `npm install; npm run build`
5. Set **Start Command**: `npm run start`
6. Add environment variable: `NODE_ENV` = `production`
7. Add environment variable: `NPM_CONFIG_PRODUCTION` = `false`
8. Add environment variable: `GITHUB_TOKEN` = your GitHub Personal Access Token (with `repo` scope)
9. Select **Free** instance and deploy

## Project Structure

```
server/index.js          Express API + SQLite database
src/
  api/base44Client.js    API client SDK
  components/
    folder/              Folder chat & media components
    hooks/               useProject, useTrashDelete
    layout/              ProjectLayout, ProjectSidebar
    shared/              CommentsSection, DeleteConfirmDialog, ImageCropEditor, TagInput
    ui/                  shadcn/ui components
  pages/                 All 15 page components
  lib/                   Auth context, query client, utilities
```

## License

MIT

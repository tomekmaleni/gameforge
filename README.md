# GameForge - Board Game Studio

A collaborative board game design workspace where teams can organize game assets, brainstorm ideas, and track development progress together.

## Join Online

**The app is live at: https://gameforge.fly.dev**

1. Open the link above
2. Enter your name and email (no password needed)
3. Create a new project or join an existing one with an invite code
4. Share the invite code with your friends so they can join too

> The server auto-stops when idle. The first load after inactivity takes a few seconds — just wait for it.

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
- **Deployment**: Fly.io with persistent volume (data survives all deploys)

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

All data is stored in SQLite on a persistent Fly.io volume — it survives all deploys and restarts. Additional safety layers:

1. **Auto-backup to GitHub** — the server pushes `backup.json` to the repo every 5 minutes (or 30s after any change) via the GitHub API
2. **Shutdown backup** — on server shutdown (SIGTERM), an emergency backup is pushed to GitHub
3. **Manual Save button** — click "Save Backup" in the sidebar to trigger an immediate backup
4. **Auto-restore** — on startup, if the database is empty, the server restores from `backup.json`

**API endpoints for data management:**
- `GET /api/export` — download the full database as JSON
- `POST /api/import` — import a JSON backup into the database
- `POST /api/backup` — trigger an immediate backup to GitHub

## Deploy to Fly.io

1. Install [Fly CLI](https://fly.io/docs/flyctl/install/)
2. `fly auth signup` (or `fly auth login`)
3. `fly apps create gameforge`
4. `fly volumes create gameforge_data --region fra --size 1`
5. `fly secrets set GITHUB_TOKEN=your_token_here`
6. `fly deploy`

## Project Structure

```
server/index.js          Express API + SQLite database
Dockerfile               Docker build for Fly.io
fly.toml                 Fly.io configuration
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

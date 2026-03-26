# GameForge - Board Game Studio

A collaborative board game design workspace where teams can organize game assets, brainstorm ideas, and track development progress together.

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

## Deploy to the Web (Render.com - Free)

The easiest way to get GameForge running online so anyone can access it:

1. Fork or push this repo to your GitHub account
2. Go to [render.com](https://render.com) and sign up with GitHub
3. Click **New +** → **Web Service**
4. Connect your **gameforge** repository
5. Render auto-detects the config from `render.yaml` — click **Apply**
6. Add a **Disk** under the service settings:
   - Name: `gameforge-data`
   - Mount Path: `/opt/render/project/src/data`
   - Size: 1 GB
7. Click **Deploy**

After a few minutes you'll get a public URL like `https://gameforge-xxxx.onrender.com`. Share it with your friends — no setup needed on their end.

> **Note**: Render's free tier spins down after 15 min of inactivity. The first request after sleep takes ~30 seconds to wake up. Your data is preserved on the persistent disk.

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

## Inviting Friends

1. Create a project
2. Go to **Members** and copy the invite code
3. Share the invite code with your friends
4. They sign in and click **Join Project** with the code

When running locally, friends on the same network can access the app at `http://<your-ip>:5173`.
When deployed on Render, just share the Render URL.

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

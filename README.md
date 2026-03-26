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

## Getting Started

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

## Inviting Friends

1. Create a project
2. Go to **Members** and copy the invite code
3. Share the invite code with your friends
4. They sign in and click **Join Project** with the code

Everyone on the same network can access the app at `http://<your-ip>:5173`.

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

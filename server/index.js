import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// ---------- paths ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
// In production, use persistent volume if available (Fly.io mounts at /data)
const DATA_DIR = process.env.NODE_ENV === 'production'
  ? (fs.existsSync('/data') ? '/data' : ROOT_DIR)
  : ROOT_DIR;
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'gameforge.db');
console.log(`Data directory: ${DATA_DIR} (persistent: ${DATA_DIR !== ROOT_DIR})`);

// ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ---------- database ----------
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}',
    created_date TEXT NOT NULL,
    updated_date TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);

  CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    created_date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS files (
    filename TEXT PRIMARY KEY,
    mimetype TEXT NOT NULL,
    data BLOB NOT NULL,
    created_date TEXT NOT NULL
  );
`);

// prepared statements (reused for performance)
const stmts = {
  insertEntity: db.prepare(
    'INSERT INTO entities (id, entity_type, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)',
  ),
  updateEntity: db.prepare(
    'UPDATE entities SET data = ?, updated_date = ? WHERE id = ? AND entity_type = ?',
  ),
  deleteEntity: db.prepare(
    'DELETE FROM entities WHERE id = ? AND entity_type = ?',
  ),
  getEntity: db.prepare(
    'SELECT * FROM entities WHERE id = ? AND entity_type = ?',
  ),
  listEntities: db.prepare(
    'SELECT * FROM entities WHERE entity_type = ?',
  ),
  upsertUser: db.prepare(
    'INSERT INTO users (email, full_name, created_date) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET full_name = excluded.full_name',
  ),
  getUser: db.prepare('SELECT * FROM users WHERE email = ?'),
};

// bulk insert inside a transaction
const bulkInsert = db.transaction((rows) => {
  for (const row of rows) {
    stmts.insertEntity.run(row.id, row.entity_type, row.data, row.created_date, row.updated_date);
  }
});

// ---------- express ----------
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '100mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Fallback: serve files from DB if not found on disk (after Render redeploy)
app.use('/uploads', (req, res, next) => {
  const filename = req.path.replace(/^\//, '');
  const row = db.prepare('SELECT * FROM files WHERE filename = ?').get(filename);
  if (!row) return next();
  // Write back to disk for future requests
  try {
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), row.data);
  } catch { /* ignore write errors */ }
  res.set('Content-Type', row.mimetype);
  return res.send(row.data);
});

// ---------- auto-backup to GitHub ----------
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'tomekmaleni/gameforge';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'master';
const BACKUP_INTERVAL = 5 * 60 * 1000;  // 5 minutes
const BACKUP_DEBOUNCE = 30 * 1000;      // 30 seconds after last change

let dataChanged = false;
let debounceTimer = null;

function generateBackupJSON() {
  const rows = db.prepare('SELECT * FROM entities').all();
  const data = {};
  for (const row of rows) {
    if (!data[row.entity_type]) data[row.entity_type] = [];
    const parsed = JSON.parse(row.data);
    parsed.id = row.id;
    parsed.created_date = row.created_date;
    parsed.updated_date = row.updated_date;
    data[row.entity_type].push(parsed);
  }
  const users = db.prepare('SELECT * FROM users').all();
  data._users = users;
  try {
    const files = db.prepare('SELECT filename, mimetype, data, created_date FROM files').all();
    data._files = files.map(f => ({
      filename: f.filename,
      mimetype: f.mimetype,
      data: Buffer.from(f.data).toString('base64'),
      created_date: f.created_date,
    }));
  } catch { data._files = []; }
  return JSON.stringify(data, null, 2);
}

async function pushBackupToGitHub() {
  if (!GITHUB_TOKEN) return;
  try {
    const content = generateBackupJSON();
    const contentBase64 = Buffer.from(content).toString('base64');

    // Get current file SHA (required for updates)
    const getRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/server/backup.json?ref=${GITHUB_BRANCH}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}`, 'User-Agent': 'GameForge' } }
    );
    let sha;
    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha;
    }

    // Push updated backup.json
    const putRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/server/backup.json`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'User-Agent': 'GameForge',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Auto-backup ${new Date().toISOString()} [skip render]`,
          content: contentBase64,
          branch: GITHUB_BRANCH,
          ...(sha ? { sha } : {}),
        }),
      }
    );

    if (putRes.ok) {
      dataChanged = false;
      console.log(`Auto-backup pushed to GitHub at ${new Date().toISOString()}`);
    } else {
      const err = await putRes.text();
      console.error('Auto-backup to GitHub failed:', putRes.status, err);
    }
  } catch (err) {
    console.error('Auto-backup to GitHub error:', err.message);
  }
}

function markDataChanged() {
  dataChanged = true;
  // Debounced backup: 2 min after last change
  if (GITHUB_TOKEN) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => pushBackupToGitHub(), BACKUP_DEBOUNCE);
  }
}

// ---------- cookie helpers ----------
function setAuthCookie(res, user) {
  res.cookie('auth_user', JSON.stringify({ email: user.email, full_name: user.full_name }), {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  });
}

function getAuthUser(req) {
  try {
    const raw = req.cookies?.auth_user;
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// simple cookie parser middleware (avoids extra dependency)
app.use((req, _res, next) => {
  req.cookies = {};
  const header = req.headers.cookie;
  if (header) {
    for (const pair of header.split(';')) {
      const idx = pair.indexOf('=');
      if (idx === -1) continue;
      const key = pair.substring(0, idx).trim();
      const val = decodeURIComponent(pair.substring(idx + 1).trim());
      req.cookies[key] = val;
    }
  }
  next();
});

// ---------- auth routes ----------
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, full_name } = req.body;
    if (!email || !full_name) {
      return res.status(400).json({ error: 'email and full_name are required' });
    }

    const now = new Date().toISOString();
    stmts.upsertUser.run(email, full_name, now);
    const user = { email, full_name };

    setAuthCookie(res, user);
    return res.json(user);
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const row = stmts.getUser.get(email);
    if (!row) {
      return res.status(404).json({ error: 'User not found. Please register first.' });
    }

    const user = { email: row.email, full_name: row.full_name };
    setAuthCookie(res, user);
    return res.json(user);
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.json(user);
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('auth_user', { path: '/' });
  return res.json({ message: 'Logged out' });
});

// ---------- valid entity types ----------
const VALID_ENTITIES = new Set([
  'AppVersion',
  'ChatMessage',
  'Comment',
  'DesignComparison',
  'Folder',
  'GameCategory',
  'GameEntry',
  'Idea',
  'LorePage',
  'Mechanic',
  'MediaItem',
  'PlaytestSession',
  'Project',
  'ProjectMember',
  'Task',
  'TrashItem',
  'VersionHistory',
]);

function validateEntityName(req, res) {
  const { entityName } = req.params;
  if (!VALID_ENTITIES.has(entityName)) {
    res.status(400).json({ error: `Invalid entity type: ${entityName}` });
    return null;
  }
  return entityName;
}

function rowToEntity(row) {
  const parsed = JSON.parse(row.data);
  return {
    id: row.id,
    ...parsed,
    created_date: row.created_date,
    updated_date: row.updated_date,
  };
}

// ---------- entity CRUD ----------

// Create
app.post('/api/entities/:entityName', (req, res) => {
  const entityName = validateEntityName(req, res);
  if (!entityName) return;

  try {
    const now = new Date().toISOString();
    const id = req.body.id || uuidv4();
    const data = { ...req.body };
    delete data.id;
    delete data.created_date;
    delete data.updated_date;

    stmts.insertEntity.run(id, entityName, JSON.stringify(data), now, now);
    markDataChanged();

    return res.status(201).json({
      id,
      ...data,
      created_date: now,
      updated_date: now,
    });
  } catch (err) {
    console.error(`Create ${entityName} error:`, err);
    return res.status(500).json({ error: 'Failed to create entity' });
  }
});

// Bulk create
app.post('/api/entities/:entityName/bulk', (req, res) => {
  const entityName = validateEntityName(req, res);
  if (!entityName) return;

  try {
    const items = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Body must be an array' });
    }

    const now = new Date().toISOString();
    const results = [];
    const rows = [];

    for (const item of items) {
      const id = item.id || uuidv4();
      const data = { ...item };
      delete data.id;
      delete data.created_date;
      delete data.updated_date;

      rows.push({
        id,
        entity_type: entityName,
        data: JSON.stringify(data),
        created_date: now,
        updated_date: now,
      });

      results.push({ id, ...data, created_date: now, updated_date: now });
    }

    bulkInsert(rows);
    markDataChanged();
    return res.status(201).json(results);
  } catch (err) {
    console.error(`Bulk create ${entityName} error:`, err);
    return res.status(500).json({ error: 'Bulk create failed' });
  }
});

// List all (with optional sort & limit)
app.get('/api/entities/:entityName', (req, res) => {
  const entityName = validateEntityName(req, res);
  if (!entityName) return;

  try {
    const rows = stmts.listEntities.all(entityName);
    let entities = rows.map(rowToEntity);

    // sort
    const sortField = req.query.sort;
    if (sortField) {
      const desc = sortField.startsWith('-');
      const field = desc ? sortField.slice(1) : sortField;
      entities.sort((a, b) => {
        const aVal = a[field] ?? '';
        const bVal = b[field] ?? '';
        if (aVal < bVal) return desc ? 1 : -1;
        if (aVal > bVal) return desc ? -1 : 1;
        return 0;
      });
    }

    // limit
    const limit = parseInt(req.query.limit, 10);
    if (limit > 0) {
      entities = entities.slice(0, limit);
    }

    return res.json(entities);
  } catch (err) {
    console.error(`List ${entityName} error:`, err);
    return res.status(500).json({ error: 'Failed to list entities' });
  }
});

// Filter
app.post('/api/entities/:entityName/filter', (req, res) => {
  const entityName = validateEntityName(req, res);
  if (!entityName) return;

  try {
    const { filters = {}, sort, limit } = req.body;

    // fast path: filter by id
    if (filters.id) {
      const row = stmts.getEntity.get(filters.id, entityName);
      if (!row) return res.json([]);
      return res.json([rowToEntity(row)]);
    }

    const rows = stmts.listEntities.all(entityName);
    let entities = rows.map(rowToEntity);

    // apply filters (field === value match)
    const filterEntries = Object.entries(filters);
    if (filterEntries.length > 0) {
      entities = entities.filter((entity) =>
        filterEntries.every(([key, value]) => {
          if (Array.isArray(value)) {
            return value.includes(entity[key]);
          }
          return entity[key] === value;
        }),
      );
    }

    // sort
    if (sort) {
      const desc = sort.startsWith('-');
      const field = desc ? sort.slice(1) : sort;
      entities.sort((a, b) => {
        const aVal = a[field] ?? '';
        const bVal = b[field] ?? '';
        if (aVal < bVal) return desc ? 1 : -1;
        if (aVal > bVal) return desc ? -1 : 1;
        return 0;
      });
    }

    // limit
    if (limit && limit > 0) {
      entities = entities.slice(0, limit);
    }

    return res.json(entities);
  } catch (err) {
    console.error(`Filter ${entityName} error:`, err);
    return res.status(500).json({ error: 'Failed to filter entities' });
  }
});

// Update
app.put('/api/entities/:entityName/:id', (req, res) => {
  const entityName = validateEntityName(req, res);
  if (!entityName) return;

  try {
    const { id } = req.params;
    const existing = stmts.getEntity.get(id, entityName);
    if (!existing) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    const now = new Date().toISOString();
    const existingData = JSON.parse(existing.data);
    const updates = { ...req.body };
    delete updates.id;
    delete updates.created_date;
    delete updates.updated_date;

    const merged = { ...existingData, ...updates };
    stmts.updateEntity.run(JSON.stringify(merged), now, id, entityName);
    markDataChanged();

    return res.json({
      id,
      ...merged,
      created_date: existing.created_date,
      updated_date: now,
    });
  } catch (err) {
    console.error(`Update ${entityName} error:`, err);
    return res.status(500).json({ error: 'Failed to update entity' });
  }
});

// Delete
app.delete('/api/entities/:entityName/:id', (req, res) => {
  const entityName = validateEntityName(req, res);
  if (!entityName) return;

  try {
    const { id } = req.params;
    const result = stmts.deleteEntity.run(id, entityName);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    markDataChanged();
    return res.json({ message: 'Deleted', id });
  } catch (err) {
    console.error(`Delete ${entityName} error:`, err);
    return res.status(500).json({ error: 'Failed to delete entity' });
  }
});

// ---------- file upload ----------
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${uuidv4()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }
  // Also save to database so it survives Render redeploys
  try {
    const fileData = fs.readFileSync(req.file.path);
    const now = new Date().toISOString();
    db.prepare('INSERT OR REPLACE INTO files (filename, mimetype, data, created_date) VALUES (?, ?, ?, ?)')
      .run(req.file.filename, req.file.mimetype, fileData, now);
    markDataChanged();
  } catch (err) {
    console.error('Failed to save file to DB:', err.message);
  }
  return res.json({ file_url: `/uploads/${req.file.filename}` });
});

// ---------- seed endpoint (one-time, creates Ruševine project) ----------
app.post('/api/seed', async (req, res) => {
  try {
    // Dynamically import and run the seed
    const count = db.prepare('SELECT COUNT(*) as c FROM entities WHERE entity_type = ?').get('Project');
    if (count.c > 0) return res.json({ message: 'Already seeded', skipped: true });
    const { execSync } = await import('child_process');
    execSync('node server/seed.js', { cwd: ROOT_DIR, stdio: 'pipe' });
    res.json({ message: 'Seed complete!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- export full database as JSON ----------
app.get('/api/export', (req, res) => {
  try {
    const content = generateBackupJSON();
    res.setHeader('Content-Disposition', 'attachment; filename="gameforge-backup.json"');
    res.setHeader('Content-Type', 'application/json');
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- manual backup trigger ----------
app.post('/api/backup', async (req, res) => {
  if (!GITHUB_TOKEN) {
    return res.status(501).json({ error: 'Auto-backup not configured (no GITHUB_TOKEN)' });
  }
  try {
    dataChanged = true; // force it
    await pushBackupToGitHub();
    // Return entity counts so user can verify backup contents
    const rows = db.prepare('SELECT entity_type, COUNT(*) as count FROM entities GROUP BY entity_type').all();
    const counts = {};
    let total = 0;
    for (const r of rows) { counts[r.entity_type] = r.count; total += r.count; }
    res.json({ message: 'Backup saved to GitHub successfully', timestamp: new Date().toISOString(), totalEntities: total, counts });
  } catch (err) {
    res.status(500).json({ error: 'Backup failed: ' + err.message });
  }
});

// ---------- import from backup JSON ----------
app.post('/api/import', (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== 'object') return res.status(400).json({ error: 'Invalid data' });
    const insert = db.prepare('INSERT OR REPLACE INTO entities (id, entity_type, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)');
    const tx = db.transaction(() => {
      for (const [entityType, entities] of Object.entries(data)) {
        if (entityType.startsWith('_')) continue; // skip _users, _files
        if (!Array.isArray(entities)) continue;
        for (const entity of entities) {
          const now = new Date().toISOString();
          const entityId = entity.id || uuidv4();
          // Strip metadata from data column (stored as separate DB columns)
          const cleanData = { ...entity };
          delete cleanData.id;
          delete cleanData.created_date;
          delete cleanData.updated_date;
          insert.run(entityId, entityType, JSON.stringify(cleanData), entity.created_date || now, entity.updated_date || now);
        }
      }
      if (data._users) {
        const upsert = db.prepare('INSERT OR REPLACE INTO users (email, full_name, created_date) VALUES (?, ?, ?)');
        for (const u of data._users) upsert.run(u.email, u.full_name, u.created_date);
      }
      // Restore uploaded files
      if (data._files && Array.isArray(data._files)) {
        const insertFile = db.prepare('INSERT OR REPLACE INTO files (filename, mimetype, data, created_date) VALUES (?, ?, ?, ?)');
        for (const f of data._files) {
          const buf = Buffer.from(f.data, 'base64');
          insertFile.run(f.filename, f.mimetype, buf, f.created_date);
          // Also write to disk
          try { fs.writeFileSync(path.join(UPLOADS_DIR, f.filename), buf); } catch { /* ignore */ }
        }
      }
    });
    tx();
    markDataChanged();
    res.json({ message: 'Import complete' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- serve frontend in production ----------
const DIST_DIR = path.join(ROOT_DIR, 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
  });
}

// ---------- auto-seed on startup if DB is empty ----------
// Auto-restore from backup.json on startup if DB is empty
{
  const count = db.prepare('SELECT COUNT(*) as c FROM entities').get();
  if (count.c === 0) {
    const backupPath = path.join(__dirname, 'backup.json');
    if (fs.existsSync(backupPath)) {
      console.log('Database is empty, restoring from backup.json...');
      try {
        const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
        const insert = db.prepare('INSERT OR REPLACE INTO entities (id, entity_type, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)');
        const tx = db.transaction(() => {
          for (const [entityType, entities] of Object.entries(data)) {
            if (entityType.startsWith('_')) continue; // skip _users, _files
            if (!Array.isArray(entities)) continue;
            for (const entity of entities) {
              const now = new Date().toISOString();
              const entityId = entity.id || uuidv4();
              // Strip metadata from data column (stored as separate DB columns)
              const cleanData = { ...entity };
              delete cleanData.id;
              delete cleanData.created_date;
              delete cleanData.updated_date;
              insert.run(entityId, entityType, JSON.stringify(cleanData), entity.created_date || now, entity.updated_date || now);
            }
          }
          if (data._users) {
            const upsert = db.prepare('INSERT OR REPLACE INTO users (email, full_name, created_date) VALUES (?, ?, ?)');
            for (const u of data._users) upsert.run(u.email, u.full_name, u.created_date);
          }
          // Restore uploaded files
          if (data._files && Array.isArray(data._files)) {
            const insertFile = db.prepare('INSERT OR REPLACE INTO files (filename, mimetype, data, created_date) VALUES (?, ?, ?, ?)');
            for (const f of data._files) {
              const buf = Buffer.from(f.data, 'base64');
              insertFile.run(f.filename, f.mimetype, buf, f.created_date);
              try { fs.writeFileSync(path.join(UPLOADS_DIR, f.filename), buf); } catch { /* ignore */ }
            }
            console.log(`Restored ${data._files.length} uploaded files.`);
          }
        });
        tx();
        console.log('Restore from backup.json complete!');
      } catch (err) {
        console.error('Restore failed:', err.message);
      }
    } else {
      console.log('Database is empty, running seed script...');
      try {
        execSync('node server/seed.js', { cwd: ROOT_DIR, stdio: 'inherit' });
        console.log('Seed complete!');
      } catch (err) {
        console.error('Seed failed:', err.message);
      }
    }
  }
}

// ---------- start periodic backup ----------
if (GITHUB_TOKEN) {
  setInterval(() => {
    if (dataChanged) pushBackupToGitHub();
  }, BACKUP_INTERVAL);
  console.log(`Auto-backup enabled: GitHub repo ${GITHUB_REPO}, every ${BACKUP_INTERVAL / 60000}min (${BACKUP_DEBOUNCE / 1000}s after changes)`);
} else {
  console.log('Auto-backup disabled: set GITHUB_TOKEN env var to enable');
}

// ---------- emergency backup on shutdown ----------
// Render sends SIGTERM before killing the process — use this window to save data
async function emergencyBackup(signal) {
  console.log(`Received ${signal} — running emergency backup...`);
  if (GITHUB_TOKEN) {
    try {
      dataChanged = true; // always force backup on shutdown
      await pushBackupToGitHub();
      console.log('Emergency backup to GitHub complete.');
    } catch (err) {
      console.error('Emergency backup failed:', err.message);
    }
  }
  // Also save to local backup.json (survives if Render keeps the build cache)
  try {
    const json = generateBackupJSON();
    fs.writeFileSync(path.join(__dirname, 'backup.json'), json);
    console.log('Emergency backup to local file complete.');
  } catch (err) {
    console.error('Local emergency backup failed:', err.message);
  }
  db.close();
  process.exit(0);
}

process.on('SIGTERM', () => emergencyBackup('SIGTERM'));
process.on('SIGINT', () => emergencyBackup('SIGINT'));

// ---------- start ----------
const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`GameForge server running on http://localhost:${PORT}`);
});

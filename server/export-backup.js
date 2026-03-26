import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT_DIR, 'gameforge.db');

const db = new Database(DB_PATH);
const rows = db.prepare('SELECT * FROM entities').all();
const data = {};
for (const row of rows) {
  if (!data[row.entity_type]) data[row.entity_type] = [];
  data[row.entity_type].push(JSON.parse(row.data));
}
const users = db.prepare('SELECT * FROM users').all();
data._users = users;

// Include uploaded files as base64
let localFileCount = 0;
try {
  const files = db.prepare('SELECT filename, mimetype, data, created_date FROM files').all();
  data._files = files.map(f => ({
    filename: f.filename,
    mimetype: f.mimetype,
    data: Buffer.from(f.data).toString('base64'),
    created_date: f.created_date,
  }));
  localFileCount = data._files.length;
} catch {
  data._files = [];
}

// If local DB has no files, try to preserve files from existing backup.json
// This prevents local pushes from wiping out files uploaded on the live server
const outPath = path.join(__dirname, 'backup.json');
if (localFileCount === 0 && fs.existsSync(outPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    if (existing._files && existing._files.length > 0) {
      data._files = existing._files;
      console.log(`  _files: ${data._files.length} (preserved from existing backup)`);
    } else {
      console.log('  _files: 0');
    }
  } catch {
    console.log('  _files: 0');
  }
} else {
  console.log(`  _files: ${data._files.length}`);
}

// Also try to fetch latest files from live server if we still have 0 files
if (data._files.length === 0) {
  try {
    const res = await fetch('https://gameforge-1-y9s0.onrender.com/api/export');
    if (res.ok) {
      const serverData = await res.json();
      if (serverData._files && serverData._files.length > 0) {
        data._files = serverData._files;
        console.log(`  _files: ${data._files.length} (fetched from live server)`);
      }
    }
  } catch {
    // Server might be sleeping, that's OK
  }
}

fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log('Exported to server/backup.json');
for (const [k, v] of Object.entries(data)) {
  if (k === '_files') continue;
  console.log(`  ${k}: ${Array.isArray(v) ? v.length : '?'}`);
}
db.close();

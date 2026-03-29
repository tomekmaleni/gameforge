import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT_DIR, 'gameforge.db');
const outPath = path.join(__dirname, 'backup.json');

const LIVE_URL = 'https://gameforge.fly.dev';

// Try to fetch the latest data from the live server first
// This ensures we never overwrite images/data uploaded on the live server
let data = null;
try {
  console.log('Fetching latest data from live server...');
  const res = await fetch(`${LIVE_URL}/api/export`, { signal: AbortSignal.timeout(15000) });
  if (res.ok) {
    data = await res.json();
    console.log('  Got live server data');
  } else {
    console.log(`  Live server returned ${res.status}, falling back to local DB`);
  }
} catch (err) {
  console.log(`  Live server unavailable (${err.message}), falling back to local DB`);
}

// Fall back to local database if live server is unavailable
if (!data) {
  const db = new Database(DB_PATH);
  const rows = db.prepare('SELECT * FROM entities').all();
  data = {};
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

  // If local DB has no files, preserve from existing backup.json
  if (localFileCount === 0 && fs.existsSync(outPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
      if (existing._files && existing._files.length > 0) {
        data._files = existing._files;
        console.log(`  _files: ${data._files.length} (preserved from existing backup)`);
      }
    } catch { /* ignore */ }
  }

  db.close();
}

fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log('Exported to server/backup.json');
for (const [k, v] of Object.entries(data)) {
  if (k === '_files') continue;
  console.log(`  ${k}: ${Array.isArray(v) ? v.length : '?'}`);
}
console.log(`  _files: ${(data._files || []).length}`);

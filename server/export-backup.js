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
try {
  const files = db.prepare('SELECT filename, mimetype, data, created_date FROM files').all();
  data._files = files.map(f => ({
    filename: f.filename,
    mimetype: f.mimetype,
    data: Buffer.from(f.data).toString('base64'),
    created_date: f.created_date,
  }));
  console.log(`  _files: ${data._files.length}`);
} catch {
  // files table may not exist yet in older DBs
  data._files = [];
  console.log('  _files: 0 (table not found)');
}

const outPath = path.join(__dirname, 'backup.json');
fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log('Exported to server/backup.json');
for (const [k, v] of Object.entries(data)) {
  if (k === '_files') continue;
  console.log(`  ${k}: ${Array.isArray(v) ? v.length : '?'}`);
}
db.close();

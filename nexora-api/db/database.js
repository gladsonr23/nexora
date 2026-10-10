const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'nexora.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

/**
 * Generates the next sequential display ID for a given prefix + table/column,
 * e.g. nextId('MAT', 'materials', 'material_id') -> "MAT-001".
 * Sequential IDs are easy for a user to read/share, unlike a raw UUID.
 */
function nextId(prefix, table, column) {
  const row = db.prepare(`SELECT ${column} as id FROM ${table} ORDER BY id DESC LIMIT 1`).get();
  let n = 1;
  if (row && row.id) {
    const match = String(row.id).match(/(\d+)$/);
    if (match) n = parseInt(match[1], 10) + 1;
  }
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

module.exports = { db, nextId, DB_PATH };

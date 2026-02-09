/**
 * SQL.js wrapper: same API as better-sqlite3 (prepare().all/get/run) for compatibility.
 * Persists to catalogue.db after each run().
 */
import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { schema } from './initDb.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'catalogue.db');

let SQL = null;
let db = null;

export async function openDb() {
  if (db) return db;
  SQL = await initSqlJs({
    locateFile: (file) => join(__dirname, 'node_modules', 'sql.js', 'dist', file),
  });
  if (existsSync(dbPath)) {
    const buf = readFileSync(dbPath);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }
  // اگر جدول ادمین وجود نداشت (دیتابیس خالی)، اسکیما و کاربر پیش‌فرض را بساز
  try {
    const stmt = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='admin_users'");
    const hasTable = stmt.step();
    stmt.free();
    if (!hasTable) {
      db.exec(schema);
      db.run("INSERT OR IGNORE INTO admin_users (username, password_hash) VALUES ('admin', 'admin123')");
      persist();
    }
  } catch (_) {
    db.exec(schema);
    db.run("INSERT OR IGNORE INTO admin_users (username, password_hash) VALUES ('admin', 'admin123')");
    persist();
  }
  return db;
}

function persist() {
  if (db) writeFileSync(dbPath, Buffer.from(db.export()));
}

export function all(sql, ...params) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

export function get(sql, ...params) {
  const rows = all(sql, ...params);
  return rows[0] || null;
}

export function run(sql, ...params) {
  if (params.length > 0) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
  } else {
    db.run(sql);
  }
  persist();
}

export function exec(sql) {
  db.run(sql);
  persist();
}

/** Wrapper object compatible with server code: db.prepare(sql).all/get/run */
export function createDbWrapper() {
  return {
    prepare(sql) {
      return {
        all(...params) { return all(sql, ...params); },
        get(...params) { return get(sql, ...params); },
        run(...params) { run(sql, ...params); },
      };
    },
  };
}

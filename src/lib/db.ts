import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'dearleaf.db');
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function generateCode(prefix: string, padLength = 6): string {
  const db = getDb();
  const year = new Date().getFullYear().toString().slice(-2);
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const pattern = `${prefix}${year}${month}%`;
  const last = db.prepare(`
    SELECT code FROM (
      SELECT code FROM sales_orders WHERE code LIKE ?
      UNION SELECT code FROM purchase_orders WHERE code LIKE ?
      UNION SELECT code FROM quotes WHERE code LIKE ?
      UNION SELECT code FROM payments WHERE code LIKE ?
      UNION SELECT code FROM inventory_transactions WHERE code LIKE ?
    ) ORDER BY code DESC LIMIT 1
  `).get(pattern, pattern, pattern, pattern, pattern) as { code: string } | undefined;
  
  let seq = 1;
  if (last) {
    const lastSeq = parseInt(last.code.slice(-padLength));
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  return `${prefix}${year}${month}${String(seq).padStart(padLength, '0')}`;
}

export function getSetting(key: string): string {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value || '';
}

export default getDb;

import { DatabaseSync } from "node:sqlite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "..", "src", "bhishma.db");
const DB_ORIGINAL_PATH = path.resolve(__dirname, "..", "src", "bhishma-original.db");

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!_db) {
    _db = new DatabaseSync(DB_PATH);
  }
  return _db;
}

export function getDbPath(): string {
  return DB_PATH;
}

export function closeDb(): void {
  if (_db) {
    try { _db.close(); } catch { /* ignore */ }
    _db = null;
  }
}

export function initBackup(): void {
  if (!fs.existsSync(DB_ORIGINAL_PATH) && fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, DB_ORIGINAL_PATH);
  }
}

export function resetDb(): void {
  if (!fs.existsSync(DB_ORIGINAL_PATH)) {
    throw new Error("No original backup found to restore from.");
  }
  closeDb();
  fs.copyFileSync(DB_ORIGINAL_PATH, DB_PATH);
}

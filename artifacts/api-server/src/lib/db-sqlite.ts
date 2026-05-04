import { DatabaseSync } from "node:sqlite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "..", "src");

export const AUTH_DB_PATH   = path.resolve(SRC_DIR, "auth.db");
export const DB_ORIGINAL_PATH = path.resolve(SRC_DIR, "bhishma-original.db");
export const USER_DBS_DIR   = path.resolve(SRC_DIR, "user_dbs");

// ── Auth DB (shared, never reset) ──────────────────────────────────────────
let _authDb: DatabaseSync | null = null;

export function getAuthDb(): DatabaseSync {
  if (!_authDb) {
    fs.mkdirSync(SRC_DIR, { recursive: true });
    _authDb = new DatabaseSync(AUTH_DB_PATH);
  }
  return _authDb;
}

// ── Per-user data DBs ───────────────────────────────────────────────────────
const _userDbs = new Map<number, DatabaseSync>();

export function getUserDbPath(userId: number): string {
  return path.resolve(USER_DBS_DIR, `bhishma-${userId}.db`);
}

export function getUserPreImportPath(userId: number): string {
  return path.resolve(USER_DBS_DIR, `bhishma-${userId}-pre-import.db`);
}

export function initUserDb(userId: number): void {
  fs.mkdirSync(USER_DBS_DIR, { recursive: true });
  const userPath = getUserDbPath(userId);
  if (!fs.existsSync(userPath)) {
    if (!fs.existsSync(DB_ORIGINAL_PATH)) {
      throw new Error("Original DB not found — cannot create user database.");
    }
    fs.copyFileSync(DB_ORIGINAL_PATH, userPath);
  }
}

function ensureExpiryColumn(db: DatabaseSync): void {
  const migrations = [
    "ALTER TABLE EnglishMotherCube ADD COLUMN itemExpiryDate TEXT",
    "ALTER TABLE HindiMotherCube ADD COLUMN itemExpiryDate TEXT",
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }
}

export function getDb(userId: number): DatabaseSync {
  if (!_userDbs.has(userId)) {
    initUserDb(userId);
    const db = new DatabaseSync(getUserDbPath(userId));
    ensureExpiryColumn(db);
    _userDbs.set(userId, db);
  }
  return _userDbs.get(userId)!;
}

export function getDbPath(userId: number): string {
  initUserDb(userId);
  return getUserDbPath(userId);
}

export function closeDb(userId?: number): void {
  if (userId !== undefined) {
    const db = _userDbs.get(userId);
    if (db) {
      try { db.close(); } catch { /* ignore */ }
      _userDbs.delete(userId);
    }
  } else {
    for (const [id, db] of _userDbs) {
      try { db.close(); } catch { /* ignore */ }
      _userDbs.delete(id);
    }
  }
}

export function resetDb(userId: number): void {
  if (!fs.existsSync(DB_ORIGINAL_PATH)) {
    throw new Error("No original backup found to restore from.");
  }
  closeDb(userId);
  fs.copyFileSync(DB_ORIGINAL_PATH, getUserDbPath(userId));
}

export function initBackup(): void {
  // Ensure the original reference DB exists. If not, try to seed from the
  // legacy shared bhishma.db so the server isn't left without a template.
  if (!fs.existsSync(DB_ORIGINAL_PATH)) {
    const legacyPath = path.resolve(SRC_DIR, "bhishma.db");
    if (fs.existsSync(legacyPath)) {
      fs.copyFileSync(legacyPath, DB_ORIGINAL_PATH);
    }
  }
}

/**
 * Ensure EnglishMotherCube and HindiMotherCube have skuCode + invBoxNo columns
 * on a given user's DB, and populate them from MotherCuber3 if needed.
 */
export function migrateInventoryLink(userId: number): void {
  const db = getDb(userId);

  const migrations = [
    "ALTER TABLE EnglishMotherCube ADD COLUMN skuCode TEXT",
    "ALTER TABLE HindiMotherCube ADD COLUMN skuCode TEXT",
    "ALTER TABLE EnglishMotherCube ADD COLUMN invBoxNo TEXT",
    "ALTER TABLE HindiMotherCube ADD COLUMN invBoxNo TEXT",
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }

  const mc3Count = (db.prepare("SELECT COUNT(*) as c FROM MotherCuber3").get() as { c: number }).c;
  const emcCount = (db.prepare("SELECT COUNT(*) as c FROM EnglishMotherCube").get() as { c: number }).c;

  if (mc3Count > 0 && emcCount > 0 && mc3Count === emcCount) {
    db.exec(`
      UPDATE EnglishMotherCube
      SET
        skuCode  = (SELECT m.SkuCode FROM MotherCuber3 m WHERE m.ID = EnglishMotherCube.id + (SELECT MIN(ID) - 1 FROM MotherCuber3)),
        invBoxNo = (SELECT m.BoxNo  FROM MotherCuber3 m WHERE m.ID = EnglishMotherCube.id + (SELECT MIN(ID) - 1 FROM MotherCuber3))
      WHERE skuCode IS NULL OR skuCode = ''
    `);
    db.exec(`
      UPDATE HindiMotherCube
      SET
        skuCode  = (SELECT skuCode  FROM EnglishMotherCube WHERE EnglishMotherCube.id = HindiMotherCube.id),
        invBoxNo = (SELECT invBoxNo FROM EnglishMotherCube WHERE EnglishMotherCube.id = HindiMotherCube.id)
      WHERE skuCode IS NULL OR skuCode = ''
    `);
  }
}

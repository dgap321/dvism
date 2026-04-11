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

/**
 * Ensure EnglishMotherCube and HindiMotherCube have skuCode + invBoxNo columns,
 * and populate them for existing CSV-imported rows by aligning insert positions.
 */
export function migrateInventoryLink(): void {
  const db = getDb();

  // Add columns if they don't exist (SQLite ignores duplicate ADD COLUMN errors)
  const migrations = [
    "ALTER TABLE EnglishMotherCube ADD COLUMN skuCode TEXT",
    "ALTER TABLE HindiMotherCube ADD COLUMN skuCode TEXT",
    "ALTER TABLE EnglishMotherCube ADD COLUMN invBoxNo TEXT",
    "ALTER TABLE HindiMotherCube ADD COLUMN invBoxNo TEXT",
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }

  // Populate skuCode and invBoxNo for rows that don't have them yet.
  // During CSV import, rows are inserted in the same order into both tables,
  // so: MotherCuber3.ID = EnglishMotherCube.id + (MIN(MotherCuber3.ID) - 1)
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

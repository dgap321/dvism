import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getUserDbPath, getUserPreImportPath, DB_ORIGINAL_PATH } from "./db-sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function hasPreImportBackup(userId: number): boolean {
  return fs.existsSync(getUserPreImportPath(userId));
}

export function revertImport(userId: number, closeDb: (uid?: number) => void): void {
  const preImportPath = getUserPreImportPath(userId);
  if (!fs.existsSync(preImportPath)) {
    throw new Error("No pre-import backup found to revert to.");
  }
  closeDb(userId);
  fs.copyFileSync(preImportPath, getUserDbPath(userId));
  fs.unlinkSync(preImportPath);
}

// ---------------------------------------------------------------------------
// CSV parser — handles quoted fields with embedded newlines and commas
// ---------------------------------------------------------------------------
export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let fields: string[] = [];
  let field = "";
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = i + 1 < text.length ? text[i + 1] : "";

    if (inQuote) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuote = false;
      } else if (ch === "\n") {
        field += " ";
      } else if (ch === "\r") {
        // skip
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ",") {
        fields.push(field);
        field = "";
      } else if (ch === "\n") {
        fields.push(field);
        rows.push(fields);
        fields = [];
        field = "";
      } else if (ch === "\r") {
        // skip
      } else {
        field += ch;
      }
    }
  }

  if (field !== "" || fields.length > 0) {
    fields.push(field);
    if (fields.some((f) => f.trim() !== "")) rows.push(fields);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  const result: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].every((f) => f.trim() === "")) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = (rows[i][j] ?? "").trim();
    });
    result.push(row);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Validate the CSV has the expected columns
// ---------------------------------------------------------------------------
const REQUIRED_COLUMNS = [
  "id", "bhishm_id", "mc_name", "cc_no", "cc_name",
  "kitname", "no_of_kit", "sku_code", "sku_name",
  "batch_no_sr_no", "mfd", "exp", "manufactured_by", "no_of_item",
];

export function validateCSVColumns(rows: Record<string, string>[]): string[] {
  if (rows.length === 0) return ["CSV file is empty."];
  const cols = Object.keys(rows[0]);
  const missing = REQUIRED_COLUMNS.filter((c) => !cols.includes(c));
  return missing.map((c) => `Missing required column: "${c}"`);
}

// ---------------------------------------------------------------------------
// Build DB from CSV rows
// ---------------------------------------------------------------------------
export function importCSVToDb(
  csvText: string,
  userId: number,
  closeDb: (uid?: number) => void
): { rowsImported: number; kitsImported: number; errors: string[] } {
  const rows = parseCSV(csvText);
  const errors = validateCSVColumns(rows);
  if (errors.length > 0) throw new Error(errors.join("; "));

  const DB_PATH = getUserDbPath(userId);
  const PRE_IMPORT_PATH = getUserPreImportPath(userId);

  // Back up current DB
  closeDb(userId);
  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, PRE_IMPORT_PATH);
  }

  // Work on a temp copy, then swap
  const tempPath = DB_PATH + ".tmp";
  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, tempPath);
  }

  const db = new DatabaseSync(tempPath);

  // Ensure skuCode + invBoxNo columns exist (may be missing after reset-db restores original)
  const colMigrations = [
    "ALTER TABLE EnglishMotherCube ADD COLUMN skuCode TEXT",
    "ALTER TABLE HindiMotherCube ADD COLUMN skuCode TEXT",
    "ALTER TABLE EnglishMotherCube ADD COLUMN invBoxNo TEXT",
    "ALTER TABLE HindiMotherCube ADD COLUMN invBoxNo TEXT",
    "ALTER TABLE EnglishMotherCube ADD COLUMN itemExpiryDate TEXT",
    "ALTER TABLE HindiMotherCube ADD COLUMN itemExpiryDate TEXT",
  ];
  for (const sql of colMigrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }

  // Clear existing content tables
  db.exec("DELETE FROM EnglishMotherCube");
  db.exec("DELETE FROM HindiMotherCube");
  db.exec("DELETE FROM MotherCuber3");

  // ── Build hierarchical ID mappings matching original DB conventions ──

  // cubeID: unique mc_name → C1, C2...
  const cubeNames = [...new Set(rows.map((r) => r.mc_name))].sort();
  const cubeNameToId = new Map<string, string>();
  cubeNames.forEach((name, i) => cubeNameToId.set(name, `C${i + 1}`));

  // boxID: unique cc_no (global, per cube) → B1, B2...
  const boxKeys = [...new Set(rows.map((r) => `${r.mc_name}||${r.cc_no}`))].sort();
  const boxKeyToId = new Map<string, string>();
  boxKeys.forEach((key, i) => boxKeyToId.set(key, `B${i + 1}`));

  // frameID: derive from first segment of cc_no (e.g. "1/3" → frameID "F1")
  const frameKeyToId = new Map<string, string>();
  const frameKeyToName = new Map<string, string>();
  for (const key of boxKeys) {
    const ccNo = key.split("||")[1] ?? "";
    const frameNum = ccNo.split("/")[0] ?? "1";
    const fKey = `${key.split("||")[0]}||${frameNum}`;
    if (!frameKeyToId.has(fKey)) {
      const n = frameKeyToId.size + 1;
      frameKeyToId.set(fKey, `F${n}`);
      frameKeyToName.set(fKey, `FRAME-${n}`);
    }
  }

  // kitCode + kitID: unique (mc_name + cc_no + kitname)
  //   kitID resets per box (K1, K2... within each box, like original DB)
  const kitKeyToCode = new Map<string, string>();
  const kitKeyToId = new Map<string, string>();
  let globalKitCounter = 1;
  const boxKitCounters = new Map<string, number>(); // boxKey → per-box kit counter

  for (const row of rows) {
    const kitKey = `${row.mc_name}||${row.cc_no}||${row.kitname}`;
    if (!kitKeyToCode.has(kitKey)) {
      kitKeyToCode.set(kitKey, `KT${String(globalKitCounter).padStart(4, "0")}`);
      const boxKey = `${row.mc_name}||${row.cc_no}`;
      const perBox = (boxKitCounters.get(boxKey) ?? 0) + 1;
      boxKitCounters.set(boxKey, perBox);
      kitKeyToId.set(kitKey, `K${perBox}`);
      globalKitCounter++;
    }
  }

  // itemID resets per kit (I1, I2... within each kit)
  const kitItemCounters = new Map<string, number>(); // kitKey → per-kit item counter

  // Insert into EnglishMotherCube
  const insertEng = db.prepare(`
    INSERT INTO EnglishMotherCube
      (id, sNo, cubeID, cubeName, frameID, frameName, boxID, boxName,
       kitID, kitName, kitPhoto, kitQty, itemID, itemName, itemPhoto, itemQty,
       status, kitExpiryDate, itemExpiryDate, kitAvailavleQty, itemAvailableQty,
       kitCode, triage1, triage2, triage3, catMedicine,
       indication, contraindication, usage, category, comments,
       skuCode, invBoxNo)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  // Insert into HindiMotherCube with same (English) data — Hindi fields blank
  const insertHin = db.prepare(`
    INSERT INTO HindiMotherCube
      (id, sNo, cubeID, cubeName, frameID, frameName, boxID, boxName,
       kitID, kitName, kitPhoto, kitQty, itemID, itemName, itemPhoto, itemQty,
       status, kitExpiryDate, itemExpiryDate, kitAvailavleQty, itemAvailableQty,
       kitCode, triage1, triage2, triage3, catMedicine,
       indication, contraindication, usage, category, comments,
       skuCode, invBoxNo)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  // Insert into MotherCuber3
  const insertInv = db.prepare(`
    INSERT INTO MotherCuber3
      (BoxNo, BoxTypeId, SkuCode, ItemName, Qty, BatchNoSrNo, MfgDate, ExpDate, CompanyName, Image, Extra1, Extra2)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  db.exec("BEGIN");
  try {
    rows.forEach((row, idx) => {
      const kitKey = `${row.mc_name}||${row.cc_no}||${row.kitname}`;
      const boxKey = `${row.mc_name}||${row.cc_no}`;
      const ccNo = row.cc_no ?? "";
      const frameNum = ccNo.split("/")[0] ?? "1";
      const fKey = `${row.mc_name}||${frameNum}`;

      const cubeId = cubeNameToId.get(row.mc_name) ?? "C1";
      const boxId = boxKeyToId.get(boxKey) ?? `B${idx + 1}`;
      const frameId = frameKeyToId.get(fKey) ?? "F1";
      const frameName = frameKeyToName.get(fKey) ?? "FRAME-1";
      const kitCode = kitKeyToCode.get(kitKey)!;
      const kitId = kitKeyToId.get(kitKey)!;

      // itemID resets per kit: I1, I2...
      const perKitCount = (kitItemCounters.get(kitKey) ?? 0) + 1;
      kitItemCounters.set(kitKey, perKitCount);
      const itemId = `I${perKitCount}`;

      const rowNum = idx + 1;

      const params = [
        rowNum,               // id (sequential PK)
        row.id || String(rowNum), // sNo = CSV original id
        cubeId,               // cubeID: C1, C2...
        row.mc_name,          // cubeName
        frameId,              // frameID: F1, F2...
        frameName,            // frameName: FRAME-1...
        boxId,                // boxID: B1, B2...
        row.cc_name,          // boxName
        kitId,                // kitID: K1, K2... (resets per box)
        row.kitname,          // kitName
        "",                   // kitPhoto
        row.no_of_kit,        // kitQty
        itemId,               // itemID: I1, I2... (resets per kit)
        row.sku_name,         // itemName
        "",                   // itemPhoto
        row.no_of_item,       // itemQty
        "A",                  // status
        "",                   // kitExpiryDate
        row.exp !== "NA" ? row.exp : "", // itemExpiryDate
        row.no_of_kit,        // kitAvailavleQty
        row.no_of_item,       // itemAvailableQty
        kitCode,              // kitCode: KT0001...
        "", "", "", "",
        "", "", "", "", "",
        row.sku_code,         // skuCode — links to MotherCuber3.SkuCode
        row.cc_no,            // invBoxNo — links to MotherCuber3.BoxNo
      ];

      insertEng.run(...params);
      insertHin.run(...params);

      insertInv.run(
        row.cc_no,
        null,
        row.sku_code,
        row.sku_name,
        parseInt(row.no_of_item, 10) || 0,
        row.batch_no_sr_no !== "NA" ? row.batch_no_sr_no : "",
        row.mfd !== "NA" ? row.mfd : "",
        row.exp !== "NA" ? row.exp : "",
        row.manufactured_by,
        null, null, null
      );
    });
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    db.close();
    throw err;
  }

  // ── Backfill kit + item photos from the original reference DB ────────────
  // Runs AFTER the main import transaction is committed, so a photo failure
  // does NOT roll back the imported data.
  if (fs.existsSync(DB_ORIGINAL_PATH)) {
    try {
      const origDb = new DatabaseSync(DB_ORIGINAL_PATH);

      const kitPhotoMap = new Map<string, string>();
      (origDb.prepare(
        `SELECT DISTINCT kitName, kitPhoto FROM EnglishMotherCube
         WHERE kitPhoto IS NOT NULL AND kitPhoto != ''`
      ).all() as { kitName: string; kitPhoto: string }[]).forEach((r) => {
        if (!kitPhotoMap.has(r.kitName.trim().toUpperCase()))
          kitPhotoMap.set(r.kitName.trim().toUpperCase(), r.kitPhoto);
      });

      const itemPhotoMap = new Map<string, string>();
      (origDb.prepare(
        `SELECT DISTINCT itemName, itemPhoto FROM EnglishMotherCube
         WHERE itemPhoto IS NOT NULL AND itemPhoto != ''`
      ).all() as { itemName: string; itemPhoto: string }[]).forEach((r) => {
        if (!itemPhotoMap.has(r.itemName.trim().toUpperCase()))
          itemPhotoMap.set(r.itemName.trim().toUpperCase(), r.itemPhoto);
      });

      origDb.close();

      const updateKitEng = db.prepare(`UPDATE EnglishMotherCube SET kitPhoto = ? WHERE UPPER(TRIM(kitName)) = ?`);
      const updateKitHin = db.prepare(`UPDATE HindiMotherCube SET kitPhoto = ? WHERE UPPER(TRIM(kitName)) = ?`);
      const updateItemEng = db.prepare(`UPDATE EnglishMotherCube SET itemPhoto = ? WHERE UPPER(TRIM(itemName)) = ?`);
      const updateItemHin = db.prepare(`UPDATE HindiMotherCube SET itemPhoto = ? WHERE UPPER(TRIM(itemName)) = ?`);

      db.exec("BEGIN");
      for (const [nameKey, photo] of kitPhotoMap) {
        updateKitEng.run(photo, nameKey);
        updateKitHin.run(photo, nameKey);
      }
      for (const [nameKey, photo] of itemPhotoMap) {
        updateItemEng.run(photo, nameKey);
        updateItemHin.run(photo, nameKey);
      }
      db.exec("COMMIT");
    } catch {
      // Non-fatal — import data is already committed; log and continue
      try { db.exec("ROLLBACK"); } catch { /* ignore */ }
    }
  }

  db.close();

  // Atomically replace the live DB
  fs.renameSync(tempPath, DB_PATH);

  return {
    rowsImported: rows.length,
    kitsImported: globalKitCounter - 1,
    errors: [],
  };
}

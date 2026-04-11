import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "..", "src");
const DB_PATH = path.resolve(SRC_DIR, "bhishma.db");
const PRE_IMPORT_PATH = path.resolve(SRC_DIR, "bhishma-pre-import.db");

export function hasPreImportBackup(): boolean {
  return fs.existsSync(PRE_IMPORT_PATH);
}

export function revertImport(closeDb: () => void): void {
  if (!fs.existsSync(PRE_IMPORT_PATH)) {
    throw new Error("No pre-import backup found to revert to.");
  }
  closeDb();
  fs.copyFileSync(PRE_IMPORT_PATH, DB_PATH);
  fs.unlinkSync(PRE_IMPORT_PATH);
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
  closeDb: () => void
): { rowsImported: number; kitsImported: number; errors: string[] } {
  const rows = parseCSV(csvText);
  const errors = validateCSVColumns(rows);
  if (errors.length > 0) throw new Error(errors.join("; "));

  // Back up current DB
  closeDb();
  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, PRE_IMPORT_PATH);
  }

  // Work on a temp copy, then swap
  const tempPath = DB_PATH + ".tmp";
  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, tempPath);
  }

  const db = new DatabaseSync(tempPath);

  // Clear existing content tables
  db.exec("DELETE FROM EnglishMotherCube");
  db.exec("DELETE FROM HindiMotherCube");
  db.exec("DELETE FROM MotherCuber3");

  // Build kit code mapping: unique (mc_name + cc_no + kitname) → kitCode
  const kitKeyToCode = new Map<string, string>();
  const kitKeyToId = new Map<string, string>();
  let kitCounter = 1;

  for (const row of rows) {
    const key = `${row.mc_name}||${row.cc_no}||${row.kitname}`;
    if (!kitKeyToCode.has(key)) {
      kitKeyToCode.set(key, `KT${String(kitCounter).padStart(4, "0")}`);
      kitKeyToId.set(key, `K${kitCounter}`);
      kitCounter++;
    }
  }

  // Insert into EnglishMotherCube
  const insertEng = db.prepare(`
    INSERT INTO EnglishMotherCube
      (id, sNo, cubeID, cubeName, frameID, frameName, boxID, boxName,
       kitID, kitName, kitPhoto, kitQty, itemID, itemName, itemPhoto, itemQty,
       status, kitExpiryDate, itemExpiryDate, kitAvailavleQty, itemAvailableQty,
       kitCode, triage1, triage2, triage3, catMedicine,
       indication, contraindication, usage, category, comments)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  // Insert into HindiMotherCube with same (English) data — Hindi fields blank
  const insertHin = db.prepare(`
    INSERT INTO HindiMotherCube
      (id, sNo, cubeID, cubeName, frameID, frameName, boxID, boxName,
       kitID, kitName, kitPhoto, kitQty, itemID, itemName, itemPhoto, itemQty,
       status, kitExpiryDate, itemExpiryDate, kitAvailavleQty, itemAvailableQty,
       kitCode, triage1, triage2, triage3, catMedicine,
       indication, contraindication, usage, category, comments)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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
      const kitCode = kitKeyToCode.get(kitKey)!;
      const kitId = kitKeyToId.get(kitKey)!;
      const itemId = `I${idx + 1}`;
      const rowNum = idx + 1;

      const params = [
        parseInt(row.id, 10) || rowNum,
        String(rowNum),
        `C${row.bhishm_id}`,
        row.mc_name,
        "",
        "",
        row.cc_no,
        row.cc_name,
        kitId,
        row.kitname,
        "",
        row.no_of_kit,
        itemId,
        row.sku_name,
        "",
        row.no_of_item,
        "A",
        "",
        row.exp !== "NA" ? row.exp : "",
        row.no_of_kit,
        row.no_of_item,
        kitCode,
        "", "", "", "",
        "", "", "", "", "",
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
    throw err;
  }
  db.close();

  // Atomically replace the live DB
  fs.renameSync(tempPath, DB_PATH);

  return {
    rowsImported: rows.length,
    kitsImported: kitCounter - 1,
    errors: [],
  };
}

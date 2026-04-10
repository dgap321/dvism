import { Router, type IRouter } from "express";
import { getDb } from "../lib/db-sqlite";
import {
  UpdateKitBody,
  UpdateKitParams,
  DeleteKitParams,
  AddItemToKitParams,
  AddItemToKitBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/kits  — one row per unique (kitCode, cubeName) — ~175 rows
// ---------------------------------------------------------------------------
router.get("/kits", async (_req, res): Promise<void> => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT kitCode, kitID, kitName, kitQty, kitPhoto,
              boxName, frameName, cubeName,
              COUNT(DISTINCT itemID) as itemCount
       FROM EnglishMotherCube
       WHERE kitCode IS NOT NULL AND kitCode != ''
       GROUP BY kitCode, cubeName
       ORDER BY kitName, cubeName`
    )
    .all();
  res.json(rows);
});

// ---------------------------------------------------------------------------
// GET /api/kits/:kitId/items?cube=CUBE-1  — kitId is kitCode
// ---------------------------------------------------------------------------
router.get("/kits/:kitId/items", async (req, res): Promise<void> => {
  const kitCode = Array.isArray(req.params.kitId)
    ? req.params.kitId[0]
    : req.params.kitId;
  const cube = req.query.cube as string | undefined;
  const db = getDb();
  // If cube is specified, filter by it; otherwise fall back to whichever cube has rows
  let rows;
  if (cube) {
    rows = db
      .prepare(
        `SELECT id, itemID, itemName, itemQty, itemPhoto, status, category
         FROM EnglishMotherCube
         WHERE kitCode = ? AND cubeName = ?
         ORDER BY CAST(REPLACE(itemID, 'I', '') AS INTEGER)`
      )
      .all(kitCode, cube);
  } else {
    rows = db
      .prepare(
        `SELECT id, itemID, itemName, itemQty, itemPhoto, status, category
         FROM EnglishMotherCube
         WHERE kitCode = ?
         AND cubeName = (SELECT cubeName FROM EnglishMotherCube WHERE kitCode = ? LIMIT 1)
         ORDER BY CAST(REPLACE(itemID, 'I', '') AS INTEGER)`
      )
      .all(kitCode, kitCode);
  }
  res.json(rows);
});

// ---------------------------------------------------------------------------
// PATCH /api/kits/:kitId  — kitId is kitCode
// ---------------------------------------------------------------------------
router.patch("/kits/:kitId", async (req, res): Promise<void> => {
  const rawKitId = Array.isArray(req.params.kitId)
    ? req.params.kitId[0]
    : req.params.kitId;
  const params = UpdateKitParams.safeParse({ kitId: rawKitId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateKitBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const db = getDb();
  const existing = db
    .prepare("SELECT kitCode FROM EnglishMotherCube WHERE kitCode = ? LIMIT 1")
    .get(params.data.kitId);
  if (!existing) {
    res.status(404).json({ error: "Kit not found" });
    return;
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.data.kitName !== undefined) {
    updates.push("kitName = ?");
    values.push(body.data.kitName);
  }
  if (body.data.kitQty !== undefined) {
    updates.push("kitQty = ?");
    values.push(body.data.kitQty);
  }

  if (updates.length > 0) {
    values.push(params.data.kitId);
    db.prepare(
      `UPDATE EnglishMotherCube SET ${updates.join(", ")} WHERE kitCode = ?`
    ).run(...values);
    db.prepare(
      `UPDATE HindiMotherCube SET ${updates.join(", ")} WHERE kitCode = ?`
    ).run(...values);
  }

  const updated = db
    .prepare(
      `SELECT kitCode, kitID, kitName, kitQty, boxName, frameName, cubeName,
              COUNT(DISTINCT itemID) as itemCount
       FROM EnglishMotherCube WHERE kitCode = ?
       GROUP BY kitCode`
    )
    .get(params.data.kitId);
  res.json(updated);
});

// ---------------------------------------------------------------------------
// POST /api/kits/:kitId/items  — add item to kit; kitId is kitCode
// ---------------------------------------------------------------------------
router.post("/kits/:kitId/items", async (req, res): Promise<void> => {
  const rawKitId = Array.isArray(req.params.kitId)
    ? req.params.kitId[0]
    : req.params.kitId;
  const params = AddItemToKitParams.safeParse({ kitId: rawKitId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = AddItemToKitBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const db = getDb();

  // Get one reference row for this kit, preferring the cube the user is looking at
  const targetCube = body.data.cubeName;
  const kitRow = db
    .prepare(
      `SELECT cubeID, cubeName, frameID, frameName, boxID, boxName,
              kitID, kitName, kitQty, kitPhoto, kitCode
       FROM EnglishMotherCube
       WHERE kitCode = ?
       ${targetCube ? "AND cubeName = ?" : ""}
       ORDER BY CASE WHEN cubeName = 'CUBE-1' THEN 0 ELSE 1 END
       LIMIT 1`
    )
    .get(...([params.data.kitId, ...(targetCube ? [targetCube] : [])] as [string, ...string[]])) as {
    cubeID: string;
    cubeName: string;
    frameID: string;
    frameName: string;
    boxID: string;
    boxName: string;
    kitID: string;
    kitName: string;
    kitQty: string;
    kitPhoto: string;
    kitCode: string;
  } | undefined;

  if (!kitRow) {
    res.status(404).json({ error: "Kit not found" });
    return;
  }

  const maxSno = (
    db
      .prepare("SELECT MAX(CAST(sNo AS INTEGER)) as maxSno FROM EnglishMotherCube")
      .get() as { maxSno: number | null }
  ).maxSno ?? 0;

  const newSno = String(maxSno + 1);

  // Auto-assign itemID scoped to this kitCode + target cube
  const maxItemN = (
    db
      .prepare(
        `SELECT MAX(CAST(REPLACE(itemID, 'I', '') AS INTEGER)) as maxN
         FROM EnglishMotherCube WHERE kitCode = ? AND cubeName = ?`
      )
      .get(params.data.kitId, kitRow.cubeName) as { maxN: number | null }
  ).maxN ?? 0;
  const assignedItemID = `I${maxItemN + 1}`;

  const kitPhotoVal  = body.data.kitPhoto  ?? kitRow.kitPhoto  ?? "";
  const kitCodeVal   = params.data.kitId;
  const itemPhotoVal = body.data.itemPhoto ?? "";

  const engResult = db
    .prepare(
      `INSERT INTO EnglishMotherCube
        (sNo, cubeID, cubeName, frameID, frameName, boxID, boxName,
         kitID, kitName, kitQty, kitPhoto, kitCode,
         itemID, itemName, itemQty, itemPhoto, status, category)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      newSno,
      kitRow.cubeID,
      kitRow.cubeName,
      kitRow.frameID,
      kitRow.frameName,
      kitRow.boxID,
      kitRow.boxName,
      kitRow.kitID,
      kitRow.kitName,
      kitRow.kitQty,
      kitPhotoVal,
      kitCodeVal,
      assignedItemID,
      body.data.itemName,
      body.data.itemQty,
      itemPhotoVal,
      body.data.status ?? "A",
      body.data.category ?? ""
    );

  db.prepare(
    `INSERT INTO HindiMotherCube
      (sNo, cubeID, cubeName, frameID, frameName, boxID, boxName,
       kitID, kitName, kitQty, kitPhoto, kitCode,
       itemID, itemName, itemQty, itemPhoto, status, category)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    newSno,
    kitRow.cubeID,
    kitRow.cubeName,
    kitRow.frameID,
    kitRow.frameName,
    kitRow.boxID,
    kitRow.boxName,
    kitRow.kitID,
    kitRow.kitName,
    kitRow.kitQty,
    kitPhotoVal,
    kitCodeVal,
    assignedItemID,
    body.data.itemName,
    body.data.itemQty,
    itemPhotoVal,
    body.data.status ?? "A",
    body.data.category ?? ""
  );

  const newItem = db
    .prepare("SELECT * FROM EnglishMotherCube WHERE id = ?")
    .get(engResult.lastInsertRowid as number);

  res.status(201).json(newItem);
});

// ---------------------------------------------------------------------------
// DELETE /api/kits/:kitId  — kitId is kitCode; deletes all items in the kit
// ---------------------------------------------------------------------------
router.delete("/kits/:kitId", async (req, res): Promise<void> => {
  const rawKitId = Array.isArray(req.params.kitId)
    ? req.params.kitId[0]
    : req.params.kitId;
  const params = DeleteKitParams.safeParse({ kitId: rawKitId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const db = getDb();
  const existing = db
    .prepare("SELECT kitCode FROM EnglishMotherCube WHERE kitCode = ? LIMIT 1")
    .get(params.data.kitId);
  if (!existing) {
    res.status(404).json({ error: "Kit not found" });
    return;
  }

  db.prepare("DELETE FROM EnglishMotherCube WHERE kitCode = ?").run(
    params.data.kitId
  );
  db.prepare("DELETE FROM HindiMotherCube WHERE kitCode = ?").run(
    params.data.kitId
  );
  res.sendStatus(204);
});

export default router;

import { Router, type IRouter } from "express";
import { getDb } from "../lib/db-sqlite";
import {
  UpdateItemBody,
  UpdateItemParams,
  DeleteItemParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/items", async (_req, res): Promise<void> => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, sNo, cubeID, cubeName, frameID, frameName, boxID, boxName,
              kitID, kitName, kitQty, itemID, itemName, itemQty, status, category
       FROM EnglishMotherCube ORDER BY id`
    )
    .all();
  res.json(rows);
});

// Search items by name (autocomplete) — distinct entries across entire DB
router.get("/items/search", async (req, res): Promise<void> => {
  const q = String(req.query.q ?? "").trim();
  if (q.length < 3) {
    res.json([]);
    return;
  }
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT itemName, itemPhoto, category, status
       FROM EnglishMotherCube
       WHERE itemName LIKE ? AND itemName IS NOT NULL AND itemName != ''
       ORDER BY itemName
       LIMIT 30`
    )
    .all(`${q}%`);
  res.json(rows);
});

router.patch("/items/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;
  const params = UpdateItemParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateItemBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM EnglishMotherCube WHERE id = ?")
    .get(params.data.id);
  if (!existing) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (body.data.itemName !== undefined) {
    updates.push("itemName = ?");
    values.push(body.data.itemName);
  }
  if (body.data.itemQty !== undefined) {
    updates.push("itemQty = ?");
    values.push(body.data.itemQty);
  }
  if (body.data.itemPhoto !== undefined) {
    updates.push("itemPhoto = ?");
    values.push(body.data.itemPhoto);
  }
  if (body.data.category !== undefined) {
    updates.push("category = ?");
    values.push(body.data.category);
  }
  if (body.data.status !== undefined) {
    updates.push("status = ?");
    values.push(body.data.status);
  }

  if (updates.length > 0) {
    values.push(params.data.id);
    db.prepare(
      `UPDATE EnglishMotherCube SET ${updates.join(", ")} WHERE id = ?`
    ).run(...values);
    db.prepare(
      `UPDATE HindiMotherCube SET ${updates.join(", ")} WHERE id = ?`
    ).run(...values);
  }

  const updated = db
    .prepare("SELECT * FROM EnglishMotherCube WHERE id = ?")
    .get(params.data.id);
  res.json(updated);
});

router.delete("/items/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;
  const params = DeleteItemParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const db = getDb();
  const existing = db
    .prepare("SELECT id, kitID, itemID FROM EnglishMotherCube WHERE id = ?")
    .get(params.data.id) as { id: number; kitID: string; itemID: string } | undefined;
  if (!existing) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const { kitID, itemID } = existing;
  const deletedN = parseInt(itemID.replace(/^I/, ""), 10);

  // Delete from both tables
  db.prepare("DELETE FROM EnglishMotherCube WHERE id = ?").run(params.data.id);
  db.prepare("DELETE FROM HindiMotherCube WHERE id = ?").run(params.data.id);

  // Re-sequence: all items in the same kit with itemID number > deletedN get decremented by 1
  if (!isNaN(deletedN)) {
    // Collect ids that need renumbering (ordered so we don't hit conflicts)
    const toRenumber = db
      .prepare(
        `SELECT id, itemID
         FROM EnglishMotherCube
         WHERE kitID = ? AND CAST(REPLACE(itemID, 'I', '') AS INTEGER) > ?
         ORDER BY CAST(REPLACE(itemID, 'I', '') AS INTEGER) ASC`
      )
      .all(kitID, deletedN) as { id: number; itemID: string }[];

    for (const row of toRenumber) {
      const n = parseInt(row.itemID.replace(/^I/, ""), 10);
      const newItemID = `I${n - 1}`;
      db.prepare("UPDATE EnglishMotherCube SET itemID = ? WHERE id = ?").run(newItemID, row.id);
      db.prepare("UPDATE HindiMotherCube SET itemID = ? WHERE id = ?").run(newItemID, row.id);
    }
  }

  res.sendStatus(204);
});

export default router;

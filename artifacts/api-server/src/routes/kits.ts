import { Router, type IRouter } from "express";
import { getDb } from "../lib/db-sqlite";
import {
  UpdateKitBody,
  UpdateKitParams,
  DeleteKitParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/kits", async (_req, res): Promise<void> => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT kitID, kitName, kitQty, boxName, frameName, cubeName,
              COUNT(DISTINCT itemID) as itemCount
       FROM EnglishMotherCube
       GROUP BY kitID
       ORDER BY kitID`
    )
    .all();
  res.json(rows);
});

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
    .prepare("SELECT kitID FROM EnglishMotherCube WHERE kitID = ? LIMIT 1")
    .get(params.data.kitId);
  if (!existing) {
    res.status(404).json({ error: "Kit not found" });
    return;
  }

  const updates: string[] = [];
  const values: string[] = [];

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
      `UPDATE EnglishMotherCube SET ${updates.join(", ")} WHERE kitID = ?`
    ).run(...values);
    db.prepare(
      `UPDATE HindiMotherCube SET ${updates.join(", ")} WHERE kitID = ?`
    ).run(...values);
  }

  const updated = db
    .prepare(
      `SELECT kitID, kitName, kitQty, boxName, frameName, cubeName,
              COUNT(DISTINCT itemID) as itemCount
       FROM EnglishMotherCube WHERE kitID = ?
       GROUP BY kitID`
    )
    .get(params.data.kitId);
  res.json(updated);
});

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
    .prepare("SELECT kitID FROM EnglishMotherCube WHERE kitID = ? LIMIT 1")
    .get(params.data.kitId);
  if (!existing) {
    res.status(404).json({ error: "Kit not found" });
    return;
  }

  db.prepare("DELETE FROM EnglishMotherCube WHERE kitID = ?").run(
    params.data.kitId
  );
  db.prepare("DELETE FROM HindiMotherCube WHERE kitID = ?").run(
    params.data.kitId
  );
  res.sendStatus(204);
});

export default router;

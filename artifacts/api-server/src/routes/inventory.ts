import { Router, type IRouter } from "express";
import { getDb } from "../lib/db-sqlite";
import {
  UpdateInventoryItemBody,
  UpdateInventoryItemParams,
  DeleteInventoryItemParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/inventory", async (_req, res): Promise<void> => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ID, BoxNo, BoxTypeId, SkuCode, ItemName, Qty,
              BatchNoSrNo, MfgDate, ExpDate, CompanyName
       FROM MotherCuber3 ORDER BY ID`
    )
    .all();
  res.json(rows);
});

router.patch("/inventory/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;
  const params = UpdateInventoryItemParams.safeParse({
    id: parseInt(rawId, 10),
  });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateInventoryItemBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const db = getDb();
  const existing = db
    .prepare("SELECT ID FROM MotherCuber3 WHERE ID = ?")
    .get(params.data.id);
  if (!existing) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (body.data.ItemName !== undefined) {
    updates.push("ItemName = ?");
    values.push(body.data.ItemName);
  }
  if (body.data.Qty !== undefined) {
    updates.push("Qty = ?");
    values.push(body.data.Qty);
  }

  if (updates.length > 0) {
    values.push(params.data.id);
    db.prepare(
      `UPDATE MotherCuber3 SET ${updates.join(", ")} WHERE ID = ?`
    ).run(...values);
  }

  const updated = db
    .prepare("SELECT * FROM MotherCuber3 WHERE ID = ?")
    .get(params.data.id);
  res.json(updated);
});

router.delete("/inventory/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;
  const params = DeleteInventoryItemParams.safeParse({
    id: parseInt(rawId, 10),
  });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const db = getDb();
  const existing = db
    .prepare("SELECT ID FROM MotherCuber3 WHERE ID = ?")
    .get(params.data.id);
  if (!existing) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }

  db.prepare("DELETE FROM MotherCuber3 WHERE ID = ?").run(params.data.id);
  res.sendStatus(204);
});

export default router;

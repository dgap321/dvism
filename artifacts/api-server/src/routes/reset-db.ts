import { Router, type IRouter } from "express";
import { resetDb, migrateInventoryLink } from "../lib/db-sqlite";

const router: IRouter = Router();

router.post("/reset-db", (_req, res): void => {
  try {
    resetDb();
    migrateInventoryLink(); // re-add skuCode/invBoxNo columns + backfill
    res.json({ success: true, message: "Database has been reset to its original state." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;

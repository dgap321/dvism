import { Router, type IRouter } from "express";
import { resetDb, migrateInventoryLink } from "../lib/db-sqlite";

const router: IRouter = Router();

router.post("/reset-db", (req, res): void => {
  try {
    const userId = req.session.userId!;
    resetDb(userId);
    migrateInventoryLink(userId); // re-add skuCode/invBoxNo columns
    res.json({ success: true, message: "Your database has been reset to its original state." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;

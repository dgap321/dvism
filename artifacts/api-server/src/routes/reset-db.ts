import { Router, type IRouter } from "express";
import { resetDb, migrateInventoryLink } from "../lib/db-sqlite";
import { logChange } from "../lib/changes-log";

const router: IRouter = Router();

router.post("/reset-db", (req, res): void => {
  try {
    const userId = req.session.userId!;
    const username = req.session.username!;
    resetDb(userId);
    migrateInventoryLink(userId); // re-add skuCode/invBoxNo columns
    logChange(userId, username, "Reset DB", "Database restored to original state");
    res.json({ success: true, message: "Your database has been reset to its original state." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;

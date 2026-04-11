import { Router, type IRouter } from "express";
import { resetDb, migrateInventoryLink } from "../lib/db-sqlite";
import { initUsersTable, ensureSuperAdmin } from "../lib/auth-db";

const router: IRouter = Router();

router.post("/reset-db", (_req, res): void => {
  try {
    resetDb();
    initUsersTable();     // recreate users table (wiped when original DB is restored)
    ensureSuperAdmin();   // guarantee super-admin account exists with correct password
    migrateInventoryLink(); // re-add skuCode/invBoxNo columns
    res.json({ success: true, message: "Database has been reset to its original state." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;

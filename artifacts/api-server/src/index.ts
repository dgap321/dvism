import app from "./app";
import { logger } from "./lib/logger";
import { initUsersTable, ensureSuperAdmin, findUserByUsername } from "./lib/auth-db";
import { initBackup, getUserDbPath, USER_DBS_DIR } from "./lib/db-sqlite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "..", "src");
const LEGACY_DB = path.resolve(SRC_DIR, "bhishma.db");

// ── Auth DB (shared, in auth.db — never reset) ────────────────────────────
initUsersTable();
ensureSuperAdmin();

// ── Reference DB (used to seed new per-user DBs) ──────────────────────────
initBackup();

// ── One-time migration: seed super admin's per-user DB from existing work ─
// If bhishma.db (the legacy shared DB) has data, use it as the starting
// point for pritam9160's personal DB so no existing work is lost.
fs.mkdirSync(USER_DBS_DIR, { recursive: true });
const superAdmin = findUserByUsername("pritam9160");
if (superAdmin) {
  const superAdminDbPath = getUserDbPath(superAdmin.id);
  if (!fs.existsSync(superAdminDbPath) && fs.existsSync(LEGACY_DB) && fs.statSync(LEGACY_DB).size > 0) {
    fs.copyFileSync(LEGACY_DB, superAdminDbPath);
    console.log(`[migration] Seeded super admin DB from legacy bhishma.db (user id=${superAdmin.id})`);
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

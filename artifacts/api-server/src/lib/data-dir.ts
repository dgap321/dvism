import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * DATA_DIR — root for all mutable runtime data (DBs, JSON logs, user uploads).
 * Set the DATA_DIR environment variable on your server so data lives outside
 * the repo and survives git pulls / redeploys.
 * Defaults to the src/ directory for backwards-compat with Replit dev mode.
 */
export const DATA_DIR: string =
  process.env["DATA_DIR"] ?? path.resolve(__dirname, "..", "src");

export const AUTH_DB_PATH    = path.join(DATA_DIR, "auth.db");
export const CHANGES_PATH    = path.join(DATA_DIR, "changes.json");
export const FORMATIONS_PATH = path.join(DATA_DIR, "formations.json");
export const USER_DBS_DIR    = path.join(DATA_DIR, "user_dbs");

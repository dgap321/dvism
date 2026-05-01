import { Router, type IRouter } from "express";
import multer from "multer";
import { importCSVToDb, revertImport, hasPreImportBackup } from "../lib/csv-import";
import { closeDb } from "../lib/db-sqlite";
import { logChange } from "../lib/changes-log";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.get("/import-csv/status", (req, res): void => {
  res.json({ hasBackup: hasPreImportBackup(req.session.userId!) });
});

router.post("/import-csv", upload.single("file"), (req, res): void => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "bad_request", message: "No file uploaded. Send a file in the 'file' field." });
      return;
    }

    const userId = req.session.userId!;
    const username = req.session.username!;
    const csvText = req.file.buffer.toString("utf-8");
    const result = importCSVToDb(csvText, userId, closeDb);

    logChange(
      userId,
      username,
      "CSV Import",
      `${result.rowsImported} items, ${result.kitsImported} kits imported from "${req.file.originalname}"`
    );

    res.json({
      success: true,
      message: `Imported ${result.rowsImported} items across ${result.kitsImported} kits. Previous DB backed up — use Revert to undo.`,
      rowsImported: result.rowsImported,
      kitsImported: result.kitsImported,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error during import.";
    res.status(422).json({ error: "import_failed", message });
  }
});

router.post("/import-csv/revert", (req, res): void => {
  try {
    const userId = req.session.userId!;
    const username = req.session.username!;
    revertImport(userId, closeDb);
    logChange(userId, username, "Reverted CSV Import", "Database restored to pre-import backup");
    res.json({ success: true, message: "Database reverted to pre-import state." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error during revert.";
    res.status(500).json({ error: "revert_failed", message });
  }
});

export default router;

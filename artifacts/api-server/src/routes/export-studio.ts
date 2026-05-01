import { Router, type IRouter } from "express";
import { getDbPath } from "../lib/db-sqlite";
import AdmZip from "adm-zip";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ZIP = path.resolve(__dirname, "..", "src", "bhishma-project-template.zip");

const router: IRouter = Router();

router.get("/export-studio", async (req, res): Promise<void> => {
  if (!fs.existsSync(TEMPLATE_ZIP)) {
    res.status(500).json({ error: "Project template ZIP not found on server." });
    return;
  }

  const dbPath = getDbPath(req.session.userId!);
  const dbBuffer = fs.readFileSync(dbPath);

  const zip = new AdmZip(TEMPLATE_ZIP);

  const dbTargets = [
    "tab-app-bhism-main/app/src/main/assets/bhishma.db",
    "tab-app-bhism-main/app/src/main/assets/12bhishma.db",
  ];

  for (const target of dbTargets) {
    const entry = zip.getEntry(target);
    if (entry) {
      zip.updateFile(target, dbBuffer);
    }
  }

  const outputBuffer = zip.toBuffer();

  res.setHeader("Content-Disposition", 'attachment; filename="tab-app-bhism-updated.zip"');
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Length", outputBuffer.length);
  res.send(outputBuffer);
});

export default router;

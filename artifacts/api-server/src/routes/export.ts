import { Router, type IRouter } from "express";
import { getDbPath } from "../lib/db-sqlite";

const router: IRouter = Router();

router.get("/export", async (req, res): Promise<void> => {
  const dbPath = getDbPath(req.session.userId!);
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="bhishma_updated.db"'
  );
  res.setHeader("Content-Type", "application/octet-stream");
  res.sendFile(dbPath);
});

export default router;

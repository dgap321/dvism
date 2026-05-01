import { Router, type IRouter } from "express";
import { listFormations, addFormation, deleteFormation } from "../lib/formations";
import { listChanges, logChange } from "../lib/changes-log";
import { getUserDbPath } from "../lib/db-sqlite";
import { getUsernameById } from "../lib/auth-db";
import fs from "fs";

const router: IRouter = Router();

router.get("/saved-formations", (req, res): void => {
  const userId = req.session.userId!;
  const role = req.session.role!;
  res.json(listFormations(userId, role));
});

router.post("/saved-formations", (req, res): void => {
  const userId = req.session.userId!;
  const role = req.session.role!;
  const username = req.session.username!;
  const { name, type } = req.body as { name?: string; type?: string };
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (type !== "sqlite" && type !== "studio") {
    res.status(400).json({ error: "type must be 'sqlite' or 'studio'" });
    return;
  }
  const formation = addFormation(name.trim(), type, userId, username);
  logChange(userId, username, "Saved Formation", `"${name.trim()}" (${type})`);
  res.status(201).json(formation);
});

router.delete("/saved-formations/:id", (req, res): void => {
  const userId = req.session.userId!;
  const role = req.session.role!;
  const { id } = req.params;
  const deleted = deleteFormation(id, userId, role);
  if (!deleted) {
    res.status(404).json({ error: "Formation not found or access denied" });
    return;
  }
  res.status(204).end();
});

// Changes log endpoint
router.get("/changes-log", (req, res): void => {
  const userId = req.session.userId!;
  const role = req.session.role!;
  res.json(listChanges(userId, role));
});

// Admin-only: download a specific user's DB
router.get("/export-user/:targetUserId", (req, res): void => {
  const role = req.session.role!;
  if (role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  const targetUserId = parseInt(req.params.targetUserId, 10);
  if (isNaN(targetUserId)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  const dbPath = getUserDbPath(targetUserId);
  if (!fs.existsSync(dbPath)) {
    res.status(404).json({ error: "User database not found" });
    return;
  }
  const username = getUsernameById(targetUserId) ?? `user-${targetUserId}`;
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="bhishma-${username}.db"`
  );
  res.sendFile(dbPath);
});

export default router;

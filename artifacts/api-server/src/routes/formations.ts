import { Router, type IRouter } from "express";
import { listFormations, addFormation, deleteFormation } from "../lib/formations";

const router: IRouter = Router();

router.get("/saved-formations", (_req, res): void => {
  res.json(listFormations());
});

router.post("/saved-formations", (req, res): void => {
  const { name, type } = req.body as { name?: string; type?: string };
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (type !== "sqlite" && type !== "studio") {
    res.status(400).json({ error: "type must be 'sqlite' or 'studio'" });
    return;
  }
  const formation = addFormation(name.trim(), type);
  res.status(201).json(formation);
});

router.delete("/saved-formations/:id", (req, res): void => {
  const { id } = req.params;
  const deleted = deleteFormation(id);
  if (!deleted) {
    res.status(404).json({ error: "Formation not found" });
    return;
  }
  res.status(204).end();
});

export default router;

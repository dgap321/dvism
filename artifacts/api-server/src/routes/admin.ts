import { Router, type IRouter } from "express";
import { listUsers, createUser, deleteUser, updateUserPassword } from "../lib/auth-db";

const router: IRouter = Router();

router.use((req, res, next) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }
  if (req.session.role !== "admin") {
    res.status(403).json({ error: "forbidden", message: "Admin access required." });
    return;
  }
  next();
});

router.get("/admin/users", (_req, res): void => {
  res.json(listUsers());
});

router.post("/admin/users", (req, res): void => {
  const { username, password, role } = req.body as {
    username?: string;
    password?: string;
    role?: string;
  };

  if (!username?.trim() || !password?.trim()) {
    res.status(400).json({ error: "bad_request", message: "Username and password are required." });
    return;
  }

  try {
    createUser(username.trim(), password.trim(), role === "admin" ? "admin" : "user");
    res.status(201).json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE")) {
      res.status(409).json({ error: "conflict", message: "Username already exists." });
    } else {
      res.status(500).json({ error: "server_error", message: msg });
    }
  }
});

router.patch("/admin/users/:id/password", (req, res): void => {
  const id = parseInt(req.params.id, 10);
  const { password } = req.body as { password?: string };

  if (!password?.trim()) {
    res.status(400).json({ error: "bad_request", message: "New password is required." });
    return;
  }

  updateUserPassword(id, password.trim());
  res.json({ ok: true });
});

router.delete("/admin/users/:id", (req, res): void => {
  const id = parseInt(req.params.id, 10);
  if (req.session.userId === id) {
    res.status(400).json({ error: "bad_request", message: "Cannot delete yourself." });
    return;
  }
  deleteUser(id);
  res.json({ ok: true });
});

export default router;

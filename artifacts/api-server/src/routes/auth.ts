import { Router, type IRouter, type Request } from "express";
import bcrypt from "bcryptjs";
import {
  findUserByUsername,
} from "../lib/auth-db";
import {
  getClientIp,
  isLockedOut,
  recordFailedAttempt,
  resetAttempts,
} from "../middleware/rate-limit";

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
    role: string;
  }
}

const router: IRouter = Router();

router.get("/auth/me", (req, res): void => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }
  res.json({
    id: req.session.userId,
    username: req.session.username,
    role: req.session.role,
  });
});

router.post("/auth/login", async (req: Request, res): Promise<void> => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "bad_request", message: "Username and password are required." });
    return;
  }

  const ip = getClientIp(req);

  const { locked, remainingMs } = isLockedOut(ip);
  if (locked) {
    res.status(429).json({
      error: "too_many_attempts",
      message: "Too many failed attempts. Please wait before trying again.",
      remainingMs,
    });
    return;
  }

  const user = findUserByUsername(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    recordFailedAttempt(ip);
    const { locked: nowLocked, remainingMs: ms } = isLockedOut(ip);
    res.status(401).json({
      error: "invalid_credentials",
      message: "Invalid username or password.",
      locked: nowLocked,
      remainingMs: nowLocked ? ms : undefined,
    });
    return;
  }

  resetAttempts(ip);

  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;

  if (user.role === "admin") {
    req.session.cookie.maxAge = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years — no timeout
  }

  req.session.save((err) => {
    if (err) {
      res.status(500).json({ error: "session_error", message: "Failed to create session." });
      return;
    }
    res.json({ id: user.id, username: user.username, role: user.role });
  });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

export default router;

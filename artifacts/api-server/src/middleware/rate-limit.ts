import type { Request, Response, NextFunction } from "express";

interface Attempt {
  count: number;
  lockedUntil: number | null;
}

const WINDOW_ATTEMPTS = 3;
const LOCKOUT_MS = 5 * 60 * 1000;

const attempts = new Map<string, Attempt>();

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return first.trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

function getRecord(ip: string): Attempt {
  if (!attempts.has(ip)) attempts.set(ip, { count: 0, lockedUntil: null });
  return attempts.get(ip)!;
}

export function isLockedOut(ip: string): { locked: boolean; remainingMs: number } {
  const rec = getRecord(ip);
  if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
    return { locked: true, remainingMs: rec.lockedUntil - Date.now() };
  }
  if (rec.lockedUntil && Date.now() >= rec.lockedUntil) {
    rec.count = 0;
    rec.lockedUntil = null;
  }
  return { locked: false, remainingMs: 0 };
}

export function recordFailedAttempt(ip: string): void {
  const rec = getRecord(ip);
  rec.count += 1;
  if (rec.count >= WINDOW_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOCKOUT_MS;
  }
}

export function resetAttempts(ip: string): void {
  attempts.delete(ip);
}


export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const { locked, remainingMs } = isLockedOut(ip);
  if (locked) {
    res.status(429).json({
      error: "too_many_attempts",
      message: "Too many failed login attempts. Please try again later.",
      remainingMs,
    });
    return;
  }
  next();
}

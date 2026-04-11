import { getDb } from "./db-sqlite";
import bcrypt from "bcryptjs";

export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  created_at: string;
}

export function initUsersTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const count = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
  if (count === 0) {
    const hash = bcrypt.hashSync("Admin@123", 10);
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run(
      "admin",
      hash,
      "admin"
    );
    console.log("[auth] Default admin created — username: admin  password: Admin@123");
  }
}

export function findUserByUsername(username: string): User | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM users WHERE username = ?").get(username) as User) ?? null;
}

export function listUsers(): Omit<User, "password_hash">[] {
  const db = getDb();
  return db
    .prepare("SELECT id, username, role, created_at FROM users ORDER BY id")
    .all() as Omit<User, "password_hash">[];
}

export function createUser(username: string, password: string, role = "user"): void {
  const db = getDb();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run(
    username,
    hash,
    role
  );
}

export function deleteUser(id: number): void {
  const db = getDb();
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
}

export function updateUserPassword(id: number, newPassword: string): void {
  const db = getDb();
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, id);
}

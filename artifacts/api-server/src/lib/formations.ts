import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FORMATIONS_PATH = path.resolve(__dirname, "..", "src", "formations.json");

export interface Formation {
  id: string;
  name: string;
  date: string;
  type: "sqlite" | "studio";
  userId: number;
  username: string;
}

function readAll(): Formation[] {
  if (!fs.existsSync(FORMATIONS_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(FORMATIONS_PATH, "utf-8")) as Formation[];
  } catch {
    return [];
  }
}

function writeAll(formations: Formation[]): void {
  fs.writeFileSync(FORMATIONS_PATH, JSON.stringify(formations, null, 2), "utf-8");
}

export function listFormations(userId: number, role: string): Formation[] {
  const all = readAll().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (role === "admin") return all;
  return all.filter((f) => f.userId === userId);
}

export function addFormation(
  name: string,
  type: "sqlite" | "studio",
  userId: number,
  username: string
): Formation {
  const all = readAll();
  const entry: Formation = {
    id: randomUUID(),
    name,
    date: new Date().toISOString(),
    type,
    userId,
    username,
  };
  all.push(entry);
  writeAll(all);
  return entry;
}

export function deleteFormation(id: string, userId: number, role: string): boolean {
  const all = readAll();
  const target = all.find((f) => f.id === id);
  if (!target) return false;
  // Only admin or the owner can delete
  if (role !== "admin" && target.userId !== userId) return false;
  const next = all.filter((f) => f.id !== id);
  writeAll(next);
  return true;
}

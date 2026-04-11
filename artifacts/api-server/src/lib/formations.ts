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

export function listFormations(): Formation[] {
  return readAll().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function addFormation(name: string, type: "sqlite" | "studio"): Formation {
  const all = readAll();
  const entry: Formation = {
    id: randomUUID(),
    name,
    date: new Date().toISOString(),
    type,
  };
  all.push(entry);
  writeAll(all);
  return entry;
}

export function deleteFormation(id: string): boolean {
  const all = readAll();
  const next = all.filter((f) => f.id !== id);
  if (next.length === all.length) return false;
  writeAll(next);
  return true;
}

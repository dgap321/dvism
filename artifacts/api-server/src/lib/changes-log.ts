import fs from "fs";
import { randomUUID } from "crypto";

import { CHANGES_PATH } from "./data-dir";


export interface ChangeEntry {
  id: string;
  userId: number;
  username: string;
  action: string;
  details: string;
  date: string;
}

function readAll(): ChangeEntry[] {
  if (!fs.existsSync(CHANGES_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(CHANGES_PATH, "utf-8")) as ChangeEntry[];
  } catch {
    return [];
  }
}

function writeAll(entries: ChangeEntry[]): void {
  // Keep only the latest 1000 entries to avoid unbounded growth
  const trimmed = entries.slice(-1000);
  fs.writeFileSync(CHANGES_PATH, JSON.stringify(trimmed, null, 2), "utf-8");
}

export function logChange(
  userId: number,
  username: string,
  action: string,
  details = ""
): void {
  const all = readAll();
  all.push({
    id: randomUUID(),
    userId,
    username,
    action,
    details,
    date: new Date().toISOString(),
  });
  writeAll(all);
}

export function listChanges(userId: number, role: string): ChangeEntry[] {
  const all = readAll().sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  if (role === "admin") return all;
  return all.filter((e) => e.userId === userId);
}

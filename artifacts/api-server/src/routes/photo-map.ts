import { Router, type IRouter } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { getDb } from "../lib/db-sqlite";

const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }
  next();
}

// Extract folder ID from a Google Drive URL
function extractFolderId(url: string): string | null {
  // Handles: /folders/FOLDER_ID, /drive/folders/FOLDER_ID, id=FOLDER_ID
  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

// Normalize a filename to a comparable key: lowercase, no extension, trim
function normalizeKey(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")  // remove extension
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ") // symbols → space
    .replace(/\s+/g, " ")
    .trim();
}

// Build normalized name → Google Drive direct-view URL (using file ID)
function driveViewUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

// Fuzzy match: does the filename key contain the item/kit name key (or vice versa)?
function isMatch(fileKey: string, nameKey: string): boolean {
  if (!nameKey || nameKey.length < 3) return false;
  return fileKey.includes(nameKey) || nameKey.includes(fileKey);
}

router.post("/photo-map/preview", requireAuth, async (req, res): Promise<void> => {
  const { folderUrl, target } = req.body as { folderUrl?: string; target?: "kits" | "items" };

  if (!folderUrl) {
    res.status(400).json({ error: "folderUrl is required" });
    return;
  }

  const folderId = extractFolderId(folderUrl);
  if (!folderId) {
    res.status(400).json({ error: "Could not extract folder ID from the URL. Please share a Google Drive folder link." });
    return;
  }

  const connectors = new ReplitConnectors();

  // List all image files in the folder
  let allFiles: { id: string; name: string }[] = [];
  let pageToken: string | undefined;

  try {
    do {
      const params = new URLSearchParams({
        q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
        fields: "nextPageToken,files(id,name)",
        pageSize: "1000",
      });
      if (pageToken) params.set("pageToken", pageToken);

      const resp = await connectors.proxy("google-drive", `/drive/v3/files?${params}`, { method: "GET" });
      const data = await resp.json() as any;

      if (data.error) {
        res.status(400).json({ error: data.error.message ?? "Google Drive API error" });
        return;
      }

      allFiles = allFiles.concat(data.files ?? []);
      pageToken = data.nextPageToken;
    } while (pageToken);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to list Drive files" });
    return;
  }

  if (allFiles.length === 0) {
    res.json({ matches: [], filesFound: 0, message: "No image files found in this folder." });
    return;
  }

  const db = getDb();
  const matches: {
    id: number;
    type: "kit" | "item";
    name: string;
    filename: string;
    photoUrl: string;
  }[] = [];

  if (!target || target === "kits") {
    // Get distinct kits
    const kits = db.prepare(
      `SELECT DISTINCT kitCode, kitName FROM EnglishMotherCube WHERE kitName IS NOT NULL AND kitName != '' ORDER BY kitName`
    ).all() as { kitCode: string; kitName: string }[];

    for (const kit of kits) {
      const kitKey = normalizeKey(kit.kitName);
      for (const file of allFiles) {
        const fileKey = normalizeKey(file.name);
        if (isMatch(fileKey, kitKey)) {
          matches.push({
            id: 0,
            type: "kit",
            name: kit.kitName,
            filename: file.name,
            photoUrl: driveViewUrl(file.id),
          });
          break;
        }
      }
    }
  }

  if (!target || target === "items") {
    // Get distinct items
    const items = db.prepare(
      `SELECT DISTINCT itemName, MIN(id) as id FROM EnglishMotherCube WHERE itemName IS NOT NULL AND itemName != '' GROUP BY itemName ORDER BY itemName`
    ).all() as { itemName: string; id: number }[];

    for (const item of items) {
      const itemKey = normalizeKey(item.itemName);
      for (const file of allFiles) {
        const fileKey = normalizeKey(file.name);
        if (isMatch(fileKey, itemKey)) {
          matches.push({
            id: item.id,
            type: "item",
            name: item.itemName,
            filename: file.name,
            photoUrl: driveViewUrl(file.id),
          });
          break;
        }
      }
    }
  }

  res.json({
    filesFound: allFiles.length,
    matches,
    message: `Found ${matches.length} match${matches.length !== 1 ? "es" : ""} from ${allFiles.length} image file${allFiles.length !== 1 ? "s" : ""}.`,
  });
});

router.post("/photo-map/apply", requireAuth, async (req, res): Promise<void> => {
  const { matches } = req.body as {
    matches?: { type: "kit" | "item"; name: string; photoUrl: string }[];
  };

  if (!Array.isArray(matches) || matches.length === 0) {
    res.status(400).json({ error: "No matches provided." });
    return;
  }

  const db = getDb();
  let kitCount = 0;
  let itemCount = 0;

  for (const m of matches) {
    if (m.type === "kit") {
      db.prepare(
        `UPDATE EnglishMotherCube SET kitPhoto = ? WHERE kitName = ?`
      ).run(m.photoUrl, m.name);
      db.prepare(
        `UPDATE HindiMotherCube SET kitPhoto = ? WHERE kitName = ?`
      ).run(m.photoUrl, m.name);
      kitCount++;
    } else if (m.type === "item") {
      db.prepare(
        `UPDATE EnglishMotherCube SET itemPhoto = ? WHERE itemName = ?`
      ).run(m.photoUrl, m.name);
      db.prepare(
        `UPDATE HindiMotherCube SET itemPhoto = ? WHERE itemName = ?`
      ).run(m.photoUrl, m.name);
      itemCount++;
    }
  }

  res.json({
    ok: true,
    message: `Updated ${kitCount} kit photo${kitCount !== 1 ? "s" : ""} and ${itemCount} item photo${itemCount !== 1 ? "s" : ""}.`,
    kitCount,
    itemCount,
  });
});

export default router;

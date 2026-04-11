import { useState } from "react";
import { ImagePlus, X, Check, Loader2, FolderOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Match {
  type: "kit" | "item";
  name: string;
  filename: string;
  photoUrl: string;
}

interface PreviewResult {
  filesFound: number;
  matches: Match[];
  message: string;
}

export function PhotoMapButton() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [folderUrl, setFolderUrl] = useState("");
  const [target, setTarget] = useState<"both" | "kits" | "items">("both");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const PREVIEW_LIMIT = 8;

  const handlePreview = async () => {
    if (!folderUrl.trim()) return;
    setLoading(true);
    setPreview(null);
    setSelected(new Set());
    try {
      const res = await fetch("/api/photo-map/preview", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderUrl: folderUrl.trim(), target: target === "both" ? undefined : target }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error ?? "Failed to scan folder." });
        return;
      }
      setPreview(data);
      // Select all by default
      setSelected(new Set(data.matches.map((_: Match, i: number) => i)));
    } catch {
      toast({ variant: "destructive", title: "Network error scanning folder." });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!preview || selected.size === 0) return;
    setApplying(true);
    const toApply = preview.matches.filter((_, i) => selected.has(i));
    try {
      const res = await fetch("/api/photo-map/apply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matches: toApply }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Photos mapped!", description: data.message });
        setOpen(false);
        setPreview(null);
        setFolderUrl("");
      } else {
        toast({ variant: "destructive", title: data.error ?? "Failed to apply." });
      }
    } catch {
      toast({ variant: "destructive", title: "Network error applying photos." });
    } finally {
      setApplying(false);
    }
  };

  const toggleAll = () => {
    if (!preview) return;
    if (selected.size === preview.matches.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(preview.matches.map((_, i) => i)));
    }
  };

  const toggleOne = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const visibleMatches = preview
    ? showAll ? preview.matches : preview.matches.slice(0, PREVIEW_LIMIT)
    : [];

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(200,180,140,0.4)" }}
      >
        <ImagePlus className="h-3.5 w-3.5" /> Map Photos
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setPreview(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-amber-500" />
              Auto-Map Photos from Google Drive
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {/* Inputs */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Google Drive Folder Link</Label>
                <Input
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={folderUrl}
                  onChange={(e) => setFolderUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePreview()}
                />
                <p className="text-xs text-muted-foreground">
                  Paste a link to any shared Google Drive folder containing your kit/item images.
                  Image filenames should contain the kit or item name for best matching.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Map photos for</Label>
                <div className="flex gap-2">
                  {(["both", "kits", "items"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTarget(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        target === t
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t === "both" ? "Kits & Items" : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handlePreview}
                disabled={loading || !folderUrl.trim()}
                className="w-full"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Scanning folder…</>
                ) : (
                  "Scan Folder & Preview Matches"
                )}
              </Button>
            </div>

            {/* Results */}
            {preview && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{preview.message}</p>
                  {preview.matches.length > 0 && (
                    <button
                      onClick={toggleAll}
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      {selected.size === preview.matches.length ? "Deselect all" : "Select all"}
                    </button>
                  )}
                </div>

                {preview.matches.length === 0 && (
                  <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                    No matches found. Try renaming your image files to match the kit/item names in the database.
                  </div>
                )}

                {preview.matches.length > 0 && (
                  <div className="rounded-xl border border-border/40 overflow-hidden divide-y divide-border/30">
                    {visibleMatches.map((m, i) => (
                      <div
                        key={i}
                        onClick={() => toggleOne(i)}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                          selected.has(i) ? "bg-primary/5" : "hover:bg-muted/10"
                        }`}
                      >
                        <div
                          className={`flex-shrink-0 h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                            selected.has(i)
                              ? "bg-primary border-primary"
                              : "border-border"
                          }`}
                        >
                          {selected.has(i) && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>

                        <img
                          src={m.photoUrl}
                          alt={m.name}
                          className="h-10 w-10 rounded-lg object-cover flex-shrink-0 bg-muted"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                m.type === "kit"
                                  ? "bg-blue-500/15 text-blue-400"
                                  : "bg-emerald-500/15 text-emerald-400"
                              }`}
                            >
                              {m.type}
                            </span>
                            <span className="text-sm font-medium text-foreground truncate">{m.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            ← {m.filename}
                          </p>
                        </div>
                      </div>
                    ))}

                    {preview.matches.length > PREVIEW_LIMIT && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowAll((v) => !v); }}
                        className="w-full px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors"
                      >
                        {showAll ? (
                          <><ChevronUp className="h-3.5 w-3.5" /> Show fewer</>
                        ) : (
                          <><ChevronDown className="h-3.5 w-3.5" /> Show {preview.matches.length - PREVIEW_LIMIT} more matches</>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-border/30 flex-shrink-0">
            <Button variant="outline" onClick={() => { setOpen(false); setPreview(null); }}>
              <X className="h-4 w-4 mr-1.5" /> Cancel
            </Button>
            {preview && preview.matches.length > 0 && (
              <Button
                onClick={handleApply}
                disabled={applying || selected.size === 0}
                className="gap-2"
              >
                {applying ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Applying…</>
                ) : (
                  <><Check className="h-4 w-4" /> Apply {selected.size} Photo{selected.size !== 1 ? "s" : ""}</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FolderArchive, Loader2 } from "lucide-react";

interface ExportNameDialogProps {
  open: boolean;
  type: "sqlite" | "studio";
  onConfirm: (name: string) => Promise<void>;
  onClose: () => void;
}

export function ExportNameDialog({ open, type, onConfirm, onClose }: ExportNameDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const label = type === "sqlite" ? "SQLite Export" : "Studio Export";
  const Icon = type === "sqlite" ? Download : FolderArchive;

  const handleConfirm = async () => {
    if (!name.trim()) {
      setError("Please enter a name for this formation.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onConfirm(name.trim());
      setName("");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setName("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-md"
        style={{ background: "rgba(11,16,50,0.97)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Icon className="h-4 w-4 text-primary" />
            {label}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Give this export a name. It will be saved to your Saved Formations with today's date.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-2">
          <Label htmlFor="formation-name" className="text-sm text-foreground">
            Formation Name
          </Label>
          <Input
            id="formation-name"
            placeholder="e.g. Kit-7 Update — April 2026"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            autoFocus
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
            className="gap-1.5 gradient-brand text-white border-0"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Save &amp; Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

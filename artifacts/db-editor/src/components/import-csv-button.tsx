import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, RotateCcw, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export function ImportCsvButton() {
  const [importing, setImporting] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState(false);
  const [result, setResult] = useState<{ message: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkBackup = async () => {
    try {
      const res = await fetch(`/api/import-csv/status`, { credentials: "include" });
      const data = await res.json();
      setHasBackup(!!data.hasBackup);
    } catch {
      setHasBackup(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!e.target.files) return;
    e.target.value = "";
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast({ variant: "destructive", title: "Invalid file", description: "Please select a .csv file." });
      return;
    }

    setImporting(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/import-csv`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult({ message: data.message, ok: true });
        setHasBackup(true);
        queryClient.invalidateQueries();
      } else {
        setResult({ message: data.message || "Import failed.", ok: false });
      }
    } catch {
      setResult({ message: "Network error during import.", ok: false });
    } finally {
      setImporting(false);
    }
  };

  const handleRevert = async () => {
    setConfirmRevert(false);
    setReverting(true);
    try {
      const res = await fetch(`/api/import-csv/revert`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: "Reverted", description: "Database restored to pre-import state." });
        setHasBackup(false);
        setResult(null);
        queryClient.invalidateQueries();
      } else {
        toast({ variant: "destructive", title: "Revert failed", description: data.message });
      }
    } catch {
      toast({ variant: "destructive", title: "Revert failed", description: "Network error." });
    } finally {
      setReverting(false);
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(200,180,140,0.4)" }}
        disabled={importing}
        onClick={() => { checkBackup(); fileRef.current?.click(); }}
      >
        <Upload className="h-3.5 w-3.5" />
        {importing ? "Importing…" : "Import CSV"}
      </Button>

      {hasBackup && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs text-amber-700"
          style={{ background: "rgba(255,240,200,0.55)", border: "1px solid rgba(200,160,60,0.4)" }}
          disabled={reverting}
          onClick={() => setConfirmRevert(true)}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {reverting ? "Reverting…" : "Revert Import"}
        </Button>
      )}

      {result && (
        <Dialog open onOpenChange={() => setResult(null)}>
          <DialogContent className="sm:max-w-[420px]" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(32px)" }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {result.ok
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  : <AlertTriangle className="h-5 w-5 text-red-500" />}
                {result.ok ? "Import Successful" : "Import Failed"}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">{result.message}</p>
            {result.ok && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                The previous database has been backed up. Use <strong>Revert Import</strong> in the header to undo.
              </p>
            )}
            <DialogFooter>
              <Button size="sm" onClick={() => setResult(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={confirmRevert} onOpenChange={setConfirmRevert}>
        <DialogContent className="sm:max-w-[380px]" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(32px)" }}>
          <DialogHeader>
            <DialogTitle>Revert Import?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will restore the database to its state before the last CSV import. All imported data will be lost.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmRevert(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleRevert}>Yes, Revert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

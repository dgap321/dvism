import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, FolderArchive, Trash2, RotateCcw, DatabaseZap } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface Formation {
  id: string;
  name: string;
  date: string;
  type: "sqlite" | "studio";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SavedFormations() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Formation | null>(null);

  const { data: formations = [], isLoading } = useQuery<Formation[]>({
    queryKey: ["saved-formations"],
    queryFn: async () => {
      const res = await fetch("/api/saved-formations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load formations");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/saved-formations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-formations"] });
      toast({ title: "Formation deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/reset-db", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Reset failed");
      }
    },
    onSuccess: () => {
      toast({ title: "Database reset", description: "bhishma.db has been restored to its original state." });
      queryClient.invalidateQueries();
    },
    onError: (err: Error) =>
      toast({ title: "Reset failed", description: err.message, variant: "destructive" }),
  });

  const handleLogout = async () => { await logout(); navigate("/login"); };

  return (
    <div className="min-h-screen aurora-bg">
      <header className="sticky top-0 z-10 ios-header">
        <div className="container max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/gryfon-logo.png"
              alt="Gryfon Technologies"
              style={{ filter: "brightness(0) invert(1)", height: "34px", objectFit: "contain" }}
            />
            <div className="h-5 w-px opacity-20" style={{ background: "white" }} />
            <div>
              <h1 className="font-bold text-sm leading-tight tracking-widest gradient-text">
                SAVED FORMATIONS
              </h1>
              <p className="text-[10px] text-muted-foreground leading-none tracking-wide">Export History</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mr-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.7)" }} />
              System Online
            </div>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs border-border/50 hover:border-primary/50"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Editor
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Export History</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              All saved formations appear below. Download again or delete entries.
            </p>
          </div>

          <Button
            onClick={() => setResetOpen(true)}
            size="sm"
            className="gap-2 font-semibold text-white"
            style={{ background: "#dc2626", border: "none" }}
          >
            <RotateCcw className="h-4 w-4" />
            RESET DB
          </Button>
        </div>

        <div
          className="glass-card rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              Loading…
            </div>
          ) : formations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <DatabaseZap className="h-10 w-10 opacity-30" />
              <p className="text-sm">No formations saved yet.</p>
              <p className="text-xs opacity-60">Export SQLite or Studio from the main editor to create one.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {formations.map((f) => (
                  <tr
                    key={f.id}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium text-foreground">{f.name}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: f.type === "sqlite" ? "rgba(59,130,246,0.15)" : "rgba(139,92,246,0.15)",
                          color: f.type === "sqlite" ? "#93c5fd" : "#c4b5fd",
                          border: `1px solid ${f.type === "sqlite" ? "rgba(59,130,246,0.25)" : "rgba(139,92,246,0.25)"}`,
                        }}
                      >
                        {f.type === "sqlite" ? (
                          <Download className="h-3 w-3" />
                        ) : (
                          <FolderArchive className="h-3 w-3" />
                        )}
                        {f.type === "sqlite" ? "SQLite" : "Studio"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{formatDate(f.date)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs h-7 border-border/50 hover:border-primary/50"
                          style={{ background: "rgba(255,255,255,0.04)" }}
                          onClick={() => {
                            window.open(f.type === "sqlite" ? "/api/export" : "/api/export-studio", "_blank");
                          }}
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(f)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent
          style={{ background: "rgba(11,16,50,0.97)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground">
              <RotateCcw className="h-5 w-5 text-red-500" />
              Reset the Database?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently overwrite <strong className="text-foreground">bhishma.db</strong> with its original state.
              All changes to items, kits, and inventory made since initial setup will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-border/50 text-muted-foreground hover:text-foreground"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="font-semibold text-white border-0"
              style={{ background: "#dc2626" }}
              onClick={() => { setResetOpen(false); resetMutation.mutate(); }}
            >
              Yes, Reset DB
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent
          style={{ background: "rgba(11,16,50,0.97)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Formation?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Remove <strong className="text-foreground">{deleteTarget?.name}</strong> from your history? This only removes the record — it does not affect the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-border/50 text-muted-foreground hover:text-foreground"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="font-semibold"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Layers, Package, Activity, Shield, LogOut, BookMarked, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ItemsTable } from "@/components/items-table";
import { KitsTable } from "@/components/kits-table";
import { InventoryTable } from "@/components/inventory-table";
import { ExportNameDialog } from "@/components/export-name-dialog";
import { AppFooter } from "@/components/app-footer";
import { ImportCsvButton } from "@/components/import-csv-button";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Download, FolderArchive } from "lucide-react";

const GOLD = "#c88a18";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("items");

  const [exportDialog, setExportDialog] = useState<{ open: boolean; type: "sqlite" | "studio" }>({
    open: false,
    type: "sqlite",
  });
  const [resetOpen, setResetOpen] = useState(false);

  const openExport = (type: "sqlite" | "studio") => setExportDialog({ open: true, type });

  const handleExportConfirm = async (name: string) => {
    const type = exportDialog.type;
    const res = await fetch("/api/saved-formations", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });

    if (!res.ok) {
      toast({ title: "Failed to save formation", variant: "destructive" });
      setExportDialog((s) => ({ ...s, open: false }));
      return;
    }

    setExportDialog((s) => ({ ...s, open: false }));
    window.open(type === "sqlite" ? "/api/export" : "/api/export-studio", "_blank");
    toast({ title: "Formation saved", description: `"${name}" added to Saved Formations.` });
  };

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/reset-db", { method: "POST", credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Reset failed");
      }
    },
    onSuccess: () =>
      toast({ title: "Database reset", description: "bhishma.db has been restored to its original state." }),
    onError: (err: Error) =>
      toast({ title: "Reset failed", description: err.message, variant: "destructive" }),
  });

  const handleLogout = async () => { await logout(); navigate("/login"); };

  const tabs = [
    { value: "items",     label: "Items",     Icon: Layers },
    { value: "kits",      label: "Kits",      Icon: Package },
    { value: "inventory", label: "Inventory", Icon: Activity },
  ];

  const lightDialog = {
    background: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(32px) saturate(160%)",
    WebkitBackdropFilter: "blur(32px) saturate(160%)",
    border: "1px solid rgba(255,255,255,0.70)",
    boxShadow: "0 16px 48px rgba(80,60,20,0.14)",
  } as React.CSSProperties;

  return (
    <div className="min-h-screen aurora-bg flex flex-col">
      {/* Rounded floating header — two-row layout */}
      <div className="sticky top-0 z-10 px-4 pt-3">
        <div className="ios-header rounded-2xl">
          <div className="container max-w-7xl mx-auto px-5 py-3 flex flex-col gap-2">

            {/* Row 1: logo + title */}
            <div className="flex items-center gap-3">
              <img
                src="/gryfon-logo.png"
                alt="Gryfon Technologies"
                style={{ filter: "brightness(0)", height: "46px", objectFit: "contain", opacity: 0.75 }}
              />
              <div className="h-5 w-px opacity-25" style={{ background: "rgba(0,0,0,0.6)" }} />
              <div>
                <h1 className="font-bold text-sm leading-tight tracking-widest gradient-text">
                  DB BHISHM TABLET
                </h1>
                <p className="text-[10px] text-muted-foreground leading-none tracking-wide">Supply Editor</p>
              </div>
            </div>

            {/* Row 2: action buttons */}
            <div className="flex items-center flex-wrap gap-2 pb-1">
              <Button
                onClick={() => openExport("sqlite")}
                variant="outline" size="sm" className="gap-1.5 text-xs"
                style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(200,180,140,0.4)" }}
              >
                <Download className="h-3.5 w-3.5" /> Export SQLite
              </Button>
              <Button
                onClick={() => openExport("studio")}
                variant="outline" size="sm" className="gap-1.5 text-xs"
                style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(200,180,140,0.4)" }}
              >
                <FolderArchive className="h-3.5 w-3.5" /> Export Studio
              </Button>
              <Button
                onClick={() => navigate("/saved-formations")}
                variant="outline" size="sm" className="gap-1.5 text-xs"
                style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(200,180,140,0.4)" }}
              >
                <BookMarked className="h-3.5 w-3.5" /> Saved Formations
              </Button>
              <ImportCsvButton />
              <Button
                onClick={() => setResetOpen(true)}
                size="sm" className="gap-1.5 text-xs font-semibold text-white border-0"
                style={{ background: "#dc2626" }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> RESET DB
              </Button>
              {user?.role === "admin" && (
                <Button
                  onClick={() => navigate("/admin")}
                  variant="outline" size="sm" className="gap-1.5 text-xs"
                  style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(200,180,140,0.4)" }}
                >
                  <Shield className="h-3.5 w-3.5" /> Admin
                </Button>
              )}
              <Button
                onClick={handleLogout}
                variant="ghost" size="icon" title="Sign out"
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

          </div>
        </div>
      </div>

      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className="grid w-[400px] grid-cols-3 mb-8"
            style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)" }}
          >
            {tabs.map(({ value, label, Icon }) => {
              const isActive = activeTab === value;
              return (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="gap-2 data-[state=active]:bg-white/25 data-[state=active]:shadow-sm"
                >
                  <Icon
                    className="h-4 w-4 shrink-0"
                    style={isActive ? { color: GOLD } : {}}
                  />
                  <span className={isActive ? "golden-text font-semibold" : ""}>{label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="items" className="m-0 focus-visible:outline-none">
            <div className="glass-card p-6 rounded-2xl">
              <div className="mb-5">
                <h2 className="text-base font-semibold text-foreground">Items Registry</h2>
                <p className="text-sm text-muted-foreground">Manage individual medical supplies and cube contents.</p>
              </div>
              <ItemsTable />
            </div>
          </TabsContent>

          <TabsContent value="kits" className="m-0 focus-visible:outline-none">
            <div className="glass-card p-6 rounded-2xl">
              <div className="mb-5">
                <h2 className="text-base font-semibold text-foreground">Kit Assemblies</h2>
                <p className="text-sm text-muted-foreground">View and modify grouped item assemblies and their quantities.</p>
              </div>
              <KitsTable />
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="m-0 focus-visible:outline-none">
            <div className="glass-card p-6 rounded-2xl">
              <div className="mb-5">
                <h2 className="text-base font-semibold text-foreground">General Inventory</h2>
                <p className="text-sm text-muted-foreground">Track bulk inventory, batches, and expirations.</p>
              </div>
              <InventoryTable />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <AppFooter />

      <ExportNameDialog
        open={exportDialog.open}
        type={exportDialog.type}
        onConfirm={handleExportConfirm}
        onClose={() => setExportDialog((s) => ({ ...s, open: false }))}
      />

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent style={lightDialog}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground">
              <RotateCcw className="h-5 w-5 text-red-500" />
              Reset the Database?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently overwrite <strong className="text-foreground">bhishma.db</strong> with its original state.
              All changes since initial setup will be lost. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="text-muted-foreground hover:text-foreground"
              style={{ background: "rgba(255,255,255,0.60)", border: "1px solid rgba(200,180,140,0.4)" }}
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
    </div>
  );
}

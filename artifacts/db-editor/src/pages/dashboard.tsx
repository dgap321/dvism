import { Download, Layers, Package, Activity, FolderArchive, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItemsTable } from "@/components/items-table";
import { KitsTable } from "@/components/kits-table";
import { InventoryTable } from "@/components/inventory-table";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const handleExport = () => window.open("/api/export", "_blank");
  const handleExportStudio = () => window.open("/api/export-studio", "_blank");
  const handleLogout = async () => { await logout(); navigate("/login"); };

  return (
    <div className="min-h-screen aurora-bg">
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b"
        style={{
          background: "rgba(11, 16, 50, 0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderColor: "rgba(255,255,255,0.07)",
        }}
      >
        <div className="container max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/gryfon-logo.png"
              alt="Gryfon Technologies"
              style={{
                filter: "brightness(0) invert(1)",
                height: "34px",
                objectFit: "contain",
              }}
            />
            <div
              className="h-5 w-px opacity-20"
              style={{ background: "white" }}
            />
            <div>
              <h1 className="font-bold text-sm leading-tight tracking-widest gradient-text">
                DB BHISHM TABLET
              </h1>
              <p className="text-[10px] text-muted-foreground leading-none tracking-wide">Supply Editor</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mr-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.7)" }} />
              System Online
            </div>
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs border-border/50 hover:border-primary/50"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <Download className="h-3.5 w-3.5" />
              Export SQLite
            </Button>
            <Button
              onClick={handleExportStudio}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs border-border/50 hover:border-primary/50"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <FolderArchive className="h-3.5 w-3.5" />
              Export Studio
            </Button>
            {user?.role === "admin" && (
              <Button
                onClick={() => navigate("/admin")}
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs border-border/50 hover:border-primary/50"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <Shield className="h-3.5 w-3.5" />
                Admin
              </Button>
            )}
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="icon"
              title="Sign out"
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="items" className="w-full">
          <TabsList
            className="grid w-[400px] grid-cols-3 mb-8 border border-border/50"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <TabsTrigger value="items" className="gap-2 data-[state=active]:gradient-brand data-[state=active]:text-white">
              <Layers className="h-4 w-4" />
              Items
            </TabsTrigger>
            <TabsTrigger value="kits" className="gap-2 data-[state=active]:gradient-brand data-[state=active]:text-white">
              <Package className="h-4 w-4" />
              Kits
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2 data-[state=active]:gradient-brand data-[state=active]:text-white">
              <Activity className="h-4 w-4" />
              Inventory
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="m-0 focus-visible:outline-none">
            <div
              className="glass-card p-6 rounded-2xl"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="mb-5">
                <h2 className="text-base font-semibold text-foreground">Items Registry</h2>
                <p className="text-sm text-muted-foreground">Manage individual medical supplies and cube contents.</p>
              </div>
              <ItemsTable />
            </div>
          </TabsContent>

          <TabsContent value="kits" className="m-0 focus-visible:outline-none">
            <div
              className="glass-card p-6 rounded-2xl"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="mb-5">
                <h2 className="text-base font-semibold text-foreground">Kit Assemblies</h2>
                <p className="text-sm text-muted-foreground">View and modify grouped item assemblies and their quantities.</p>
              </div>
              <KitsTable />
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="m-0 focus-visible:outline-none">
            <div
              className="glass-card p-6 rounded-2xl"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="mb-5">
                <h2 className="text-base font-semibold text-foreground">General Inventory</h2>
                <p className="text-sm text-muted-foreground">Track bulk inventory, batches, and expirations.</p>
              </div>
              <InventoryTable />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

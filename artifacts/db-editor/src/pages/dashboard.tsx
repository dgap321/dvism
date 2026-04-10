import { Download, Database, Layers, Package, Activity, FolderArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItemsTable } from "@/components/items-table";
import { KitsTable } from "@/components/kits-table";
import { InventoryTable } from "@/components/inventory-table";

export default function Dashboard() {
  const handleExport = () => {
    window.open("/api/export", "_blank");
  };

  const handleExportStudio = () => {
    window.open("/api/export-studio", "_blank");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 text-primary">
            <div className="bg-primary/10 p-2 rounded-md">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold text-lg leading-tight tracking-tight text-foreground">Bhishma DB</h1>
              <p className="text-xs text-muted-foreground leading-none">Supply Editor</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mr-4">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
              System Online
            </div>
            <Button onClick={handleExport} variant="outline" className="gap-2 shadow-sm">
              <Download className="h-4 w-4" />
              Export SQLite
            </Button>
            <Button onClick={handleExportStudio} className="gap-2 shadow-sm">
              <FolderArchive className="h-4 w-4" />
              Export Studio File
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="items" className="w-full">
          <TabsList className="grid w-[400px] grid-cols-3 mb-8">
            <TabsTrigger value="items" className="gap-2">
              <Layers className="h-4 w-4" />
              Items
            </TabsTrigger>
            <TabsTrigger value="kits" className="gap-2">
              <Package className="h-4 w-4" />
              Kits
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2">
              <Activity className="h-4 w-4" />
              Inventory
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="items" className="m-0 focus-visible:outline-none">
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">Items Registry</h2>
                <p className="text-sm text-muted-foreground">Manage individual medical supplies and cube contents.</p>
              </div>
              <ItemsTable />
            </div>
          </TabsContent>
          
          <TabsContent value="kits" className="m-0 focus-visible:outline-none">
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">Kit Assemblies</h2>
                <p className="text-sm text-muted-foreground">View and modify grouped item assemblies and their quantities.</p>
              </div>
              <KitsTable />
            </div>
          </TabsContent>
          
          <TabsContent value="inventory" className="m-0 focus-visible:outline-none">
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">General Inventory</h2>
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
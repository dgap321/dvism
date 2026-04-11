import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Edit, Trash2, AlertCircle } from "lucide-react";
import { InventoryItem } from "@workspace/api-client-react";
import { 
  useListInventory, 
  getListInventoryQueryKey, 
  useUpdateInventoryItem, 
  useDeleteInventoryItem 
} from "@workspace/api-client-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";

export function InventoryTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({ itemName: "", qty: "" });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: inventory = [], isLoading } = useListInventory({ 
    query: { queryKey: getListInventoryQueryKey() } 
  });
  
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();

  const filteredInventory = inventory.filter(item => 
    item.ItemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.BoxNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.SkuCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditClick = (item: InventoryItem) => {
    setEditingItem(item);
    setEditForm({
      itemName: item.ItemName || "",
      qty: item.Qty !== null && item.Qty !== undefined ? String(item.Qty) : ""
    });
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    
    updateItem.mutate(
      { 
        id: editingItem.ID, 
        data: { 
          ItemName: editForm.itemName, 
          Qty: editForm.qty ? parseInt(editForm.qty, 10) : undefined 
        } 
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
          setEditingItem(null);
          toast({
            title: "Inventory updated",
            description: "The inventory item has been successfully updated.",
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update the inventory item.",
          });
        }
      }
    );
  };

  const handleDeleteConfirm = () => {
    if (!deletingItem) return;
    
    deleteItem.mutate(
      { id: deletingItem.ID },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
          setDeletingItem(null);
          toast({
            title: "Inventory deleted",
            description: "The inventory item has been successfully deleted.",
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to delete the inventory item.",
          });
        }
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, or Box..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground font-medium">
          {isLoading ? "Loading..." : `${filteredInventory.length} items found`}
        </div>
      </div>

      <div className="border border-border/50 rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Box / Type</TableHead>
              <TableHead>Batch / Mfg / Exp</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredInventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No inventory items found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              filteredInventory.map((item) => (
                <TableRow key={item.ID}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.ID}</TableCell>
                  <TableCell className="font-medium text-foreground">{item.ItemName}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.SkuCode || "-"}</TableCell>
                  <TableCell className="font-semibold">{item.Qty !== null ? item.Qty : "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.BoxNo || "-"} / {item.BoxTypeId || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    <div>Batch: {item.BatchNoSrNo || "-"}</div>
                    <div className="text-muted-foreground/70">
                      {item.MfgDate ? `Mfg: ${item.MfgDate}` : ""} {item.ExpDate ? `Exp: ${item.ExpDate}` : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm truncate max-w-[120px]" title={item.CompanyName || ""}>
                    {item.CompanyName || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}>
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingItem(item)}>
                        <Trash2 className="h-4 w-4 text-destructive/80" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="itemName">Item Name</Label>
              <Input
                id="itemName"
                value={editForm.itemName}
                onChange={(e) => setEditForm(prev => ({ ...prev, itemName: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                type="number"
                value={editForm.qty}
                onChange={(e) => setEditForm(prev => ({ ...prev, qty: e.target.value }))}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded border border-muted">
              <strong>Details:</strong> SKU: {editingItem?.SkuCode || 'N/A'} • Box: {editingItem?.BoxNo || 'N/A'}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateItem.isPending}>
              {updateItem.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete Inventory Item
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingItem?.ItemName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteItem.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
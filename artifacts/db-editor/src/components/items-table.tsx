import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Edit, Trash2, Database, AlertCircle } from "lucide-react";
import { Item } from "@workspace/api-client-react";
import { 
  useListItems, 
  getListItemsQueryKey, 
  useUpdateItem, 
  useDeleteItem 
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

export function ItemsTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [editForm, setEditForm] = useState({ itemName: "", itemQty: "" });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: items = [], isLoading } = useListItems({ 
    query: { queryKey: getListItemsQueryKey() } 
  });
  
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();

  const filteredItems = items.filter(item => 
    item.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.kitName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.cubeName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditClick = (item: Item) => {
    setEditingItem(item);
    setEditForm({
      itemName: item.itemName || "",
      itemQty: item.itemQty || ""
    });
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    
    updateItem.mutate(
      { 
        id: editingItem.id, 
        data: { 
          itemName: editForm.itemName, 
          itemQty: editForm.itemQty 
        } 
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
          setEditingItem(null);
          toast({
            title: "Item updated",
            description: "The item has been successfully updated.",
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update the item.",
          });
        }
      }
    );
  };

  const handleDeleteConfirm = () => {
    if (!deletingItem) return;
    
    deleteItem.mutate(
      { id: deletingItem.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
          setDeletingItem(null);
          toast({
            title: "Item deleted",
            description: "The item has been successfully deleted.",
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to delete the item.",
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
            placeholder="Search items, kits, or cubes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground font-medium">
          {isLoading ? "Loading..." : `${filteredItems.length} items found`}
        </div>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">S.No</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Kit</TableHead>
              <TableHead>Box / Frame</TableHead>
              <TableHead>Cube</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No items found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.sNo}</TableCell>
                  <TableCell className="font-medium text-foreground">{item.itemName}</TableCell>
                  <TableCell>{item.itemQty}</TableCell>
                  <TableCell className="text-muted-foreground">{item.kitName || "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.boxName} / {item.frameName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.cubeName}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'OK' ? 'secondary' : 'outline'} className="font-mono text-[10px]">
                      {item.status || "N/A"}
                    </Badge>
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
            <DialogTitle>Edit Item</DialogTitle>
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
              <Label htmlFor="itemQty">Quantity</Label>
              <Input
                id="itemQty"
                value={editForm.itemQty}
                onChange={(e) => setEditForm(prev => ({ ...prev, itemQty: e.target.value }))}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded border border-muted">
              <strong>Context:</strong> ID: {editingItem?.id} • Cube: {editingItem?.cubeName} • Kit: {editingItem?.kitName}
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
              Delete Item
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingItem?.itemName}</strong>? This action cannot be undone.
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
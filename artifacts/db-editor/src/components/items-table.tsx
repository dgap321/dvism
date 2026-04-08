import { useState, Fragment } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Edit, Trash2, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
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
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  
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
              <TableHead className="w-8"></TableHead>
              <TableHead className="w-[80px]">S.No</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="w-[60px]">Qty</TableHead>
              <TableHead>Kit</TableHead>
              <TableHead>Box</TableHead>
              <TableHead className="w-[70px]">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
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
              filteredItems.map((item) => {
                const isExpanded = expandedRows.has(item.id);
                return (
                  <Fragment key={item.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/30"
                      data-testid={`row-item-${item.id}`}
                    >
                      {/* Expand toggle */}
                      <TableCell className="pr-0">
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="text-muted-foreground hover:text-foreground"
                          data-testid={`button-expand-${item.id}`}
                        >
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4" />
                            : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </TableCell>

                      {/* S.No */}
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.sNo}
                      </TableCell>

                      {/* Item name + item ID */}
                      <TableCell>
                        <div className="font-medium text-foreground leading-tight">
                          {item.itemName}
                        </div>
                        {item.itemID && (
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            ID: {item.itemID}
                          </div>
                        )}
                      </TableCell>

                      {/* Qty */}
                      <TableCell className="font-medium">{item.itemQty}</TableCell>

                      {/* Kit: kitID badge + kitName */}
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            {item.kitID && (
                              <span className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold font-mono text-primary border border-primary/20">
                                {item.kitID}
                              </span>
                            )}
                            <span className="text-sm font-medium text-foreground">
                              {item.kitName || "-"}
                            </span>
                          </div>
                          {item.kitQty && (
                            <div className="text-[11px] text-muted-foreground">
                              Kit qty: {item.kitQty}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Box name */}
                      <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                        <div className="truncate" title={item.boxName ?? undefined}>
                          {item.boxName || "-"}
                        </div>
                        {item.frameName && (
                          <div className="text-[11px] text-muted-foreground/70 truncate">
                            {item.frameName} &bull; {item.cubeName}
                          </div>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant={item.status === "OK" ? "secondary" : "outline"}
                          className="font-mono text-[10px]"
                        >
                          {item.status || "N/A"}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(item)}
                            data-testid={`button-edit-item-${item.id}`}
                          >
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingItem(item)}
                            data-testid={`button-delete-item-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive/80" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={8} className="py-2 px-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs pl-6">
                            <div>
                              <span className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold">Item ID</span>
                              <div className="font-mono font-medium text-foreground">{item.itemID || "-"}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold">Kit ID</span>
                              <div className="font-mono font-medium text-foreground">{item.kitID || "-"}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold">Kit Name</span>
                              <div className="font-medium text-foreground">{item.kitName || "-"}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold">Kit Qty</span>
                              <div className="font-medium text-foreground">{item.kitQty || "-"}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold">Box</span>
                              <div className="text-foreground">{item.boxName || "-"}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold">Frame</span>
                              <div className="text-foreground">{item.frameName || "-"}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold">Cube</span>
                              <div className="text-foreground">{item.cubeName || "-"}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold">Category</span>
                              <div className="text-foreground">{item.category || "-"}</div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
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
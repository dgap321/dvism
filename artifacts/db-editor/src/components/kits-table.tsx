import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Edit, Trash2, AlertCircle, Package } from "lucide-react";
import { Kit } from "@workspace/api-client-react";
import { 
  useListKits, 
  getListKitsQueryKey, 
  useUpdateKit, 
  useDeleteKit 
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

export function KitsTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingKit, setEditingKit] = useState<Kit | null>(null);
  const [deletingKit, setDeletingKit] = useState<Kit | null>(null);
  const [editForm, setEditForm] = useState({ kitName: "", kitQty: "" });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: kits = [], isLoading } = useListKits({ 
    query: { queryKey: getListKitsQueryKey() } 
  });
  
  const updateKit = useUpdateKit();
  const deleteKit = useDeleteKit();

  const filteredKits = kits.filter(kit => 
    kit.kitName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kit.kitID.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kit.cubeName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditClick = (kit: Kit) => {
    setEditingKit(kit);
    setEditForm({
      kitName: kit.kitName || "",
      kitQty: kit.kitQty || ""
    });
  };

  const handleSaveEdit = () => {
    if (!editingKit) return;
    
    updateKit.mutate(
      { 
        kitId: editingKit.kitID, 
        data: { 
          kitName: editForm.kitName, 
          kitQty: editForm.kitQty 
        } 
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListKitsQueryKey() });
          setEditingKit(null);
          toast({
            title: "Kit updated",
            description: "The kit has been successfully updated.",
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update the kit.",
          });
        }
      }
    );
  };

  const handleDeleteConfirm = () => {
    if (!deletingKit) return;
    
    deleteKit.mutate(
      { kitId: deletingKit.kitID },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListKitsQueryKey() });
          setDeletingKit(null);
          toast({
            title: "Kit deleted",
            description: "All items in the kit have been deleted.",
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to delete the kit.",
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
            placeholder="Search kits by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground font-medium">
          {isLoading ? "Loading..." : `${filteredKits.length} kits found`}
        </div>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Kit ID</TableHead>
              <TableHead>Kit Name</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Items inside</TableHead>
              <TableHead>Box / Frame</TableHead>
              <TableHead>Cube</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredKits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No kits found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              filteredKits.map((kit) => (
                <TableRow key={kit.kitID}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{kit.kitID}</TableCell>
                  <TableCell className="font-medium text-foreground flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    {kit.kitName}
                  </TableCell>
                  <TableCell>{kit.kitQty}</TableCell>
                  <TableCell className="text-muted-foreground">{kit.itemCount} items</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {kit.boxName} / {kit.frameName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{kit.cubeName}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(kit)}>
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingKit(kit)}>
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

      <Dialog open={!!editingKit} onOpenChange={(open) => !open && setEditingKit(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Kit</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="kitName">Kit Name</Label>
              <Input
                id="kitName"
                value={editForm.kitName}
                onChange={(e) => setEditForm(prev => ({ ...prev, kitName: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="kitQty">Quantity</Label>
              <Input
                id="kitQty"
                value={editForm.kitQty}
                onChange={(e) => setEditForm(prev => ({ ...prev, kitQty: e.target.value }))}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded border border-muted">
              <strong>Context:</strong> Kit ID: {editingKit?.kitID} • Items: {editingKit?.itemCount}
              <br/>
              <em>Note: This will update all items belonging to this kit ID.</em>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingKit(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateKit.isPending}>
              {updateKit.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingKit} onOpenChange={(open) => !open && setDeletingKit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete Kit
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingKit?.kitName}</strong>? This will permanently delete <strong>{deletingKit?.itemCount} items</strong> associated with this kit. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteKit.isPending ? "Deleting..." : "Delete Kit & Items"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
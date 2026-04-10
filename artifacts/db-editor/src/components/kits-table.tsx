import { useState, useEffect, useRef, Fragment } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Search, Edit, Trash2, AlertCircle, Package, Plus,
  ChevronDown, ChevronRight, Image as ImageIcon,
} from "lucide-react";
import { Kit } from "@workspace/api-client-react";
import {
  useListKits,
  getListKitsQueryKey,
  useUpdateKit,
  useDeleteKit,
  useUpdateItem,
  useDeleteItem,
  useAddItemToKit,
  getListItemsQueryKey,
} from "@workspace/api-client-react";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface KitItem {
  id: number;
  itemID: string;
  itemName: string;
  itemQty: string;
  itemPhoto: string | null;
  status: string | null;
  category: string | null;
}

interface SearchSuggestion {
  itemName: string;
  itemPhoto: string | null;
  category: string | null;
  status: string | null;
}

type AddItemForm = {
  itemName: string;
  itemQty: string;
  itemPhoto: string;
  status: string;
  category: string;
  kitPhoto: string;
  kitCode: string;
};

type EditItemForm = {
  itemName: string;
  itemQty: string;
  itemPhoto: string;
  status: string;
  category: string;
};

// ---------------------------------------------------------------------------
// Autocomplete Item Name Input
// ---------------------------------------------------------------------------
function ItemNameAutocomplete({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: SearchSuggestion) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: suggestions = [] } = useQuery<SearchSuggestion[]>({
    queryKey: ["item-search", value],
    queryFn: async () => {
      if (value.trim().length < 3) return [];
      const res = await fetch(`/api/items/search?q=${encodeURIComponent(value.trim())}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: value.trim().length >= 3,
    staleTime: 10_000,
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Input
        placeholder="Type 3+ letters to search all items..."
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => value.trim().length >= 3 && setOpen(true)}
        autoComplete="off"
        data-testid="input-add-item-name"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-52 overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s.itemName}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 flex items-start gap-2 border-b last:border-b-0"
              onMouseDown={() => {
                onSelect(s);
                setOpen(false);
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-foreground">{s.itemName}</div>
                {(s.category || s.status) && (
                  <div className="text-[11px] text-muted-foreground">
                    {s.category}{s.category && s.status ? " · " : ""}{s.status}
                  </div>
                )}
              </div>
              {s.itemPhoto && (
                <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">
                  <ImageIcon className="h-3 w-3 inline mr-0.5" />{s.itemPhoto}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {value.trim().length >= 3 && suggestions.length === 0 && open && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow text-xs text-muted-foreground px-3 py-2">
          No matching items found
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expanded kit items panel
// ---------------------------------------------------------------------------
function KitItemsPanel({
  kit,
  onAddItem,
}: {
  kit: Kit;
  onAddItem: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<KitItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<KitItem | null>(null);
  const [editForm, setEditForm] = useState<EditItemForm>({
    itemName: "", itemQty: "", itemPhoto: "", status: "A", category: "",
  });

  const kitItemsKey = ["kit-items", kit.kitCode, kit.cubeName, kit.boxName];

  const { data: items = [], isLoading } = useQuery<KitItem[]>({
    queryKey: kitItemsKey,
    queryFn: async () => {
      const cube = encodeURIComponent(kit.cubeName);
      const box  = encodeURIComponent(kit.boxName);
      const res = await fetch(`/api/kits/${kit.kitCode}/items?cube=${cube}&box=${box}`);
      if (!res.ok) throw new Error("Failed to load items");
      return res.json();
    },
    staleTime: 30_000,
  });

  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();

  const handleEditClick = (item: KitItem) => {
    setEditingItem(item);
    setEditForm({
      itemName: item.itemName,
      itemQty: item.itemQty,
      itemPhoto: item.itemPhoto ?? "",
      status: item.status ?? "A",
      category: item.category ?? "",
    });
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    updateItem.mutate(
      {
        id: editingItem.id,
        data: {
          itemName: editForm.itemName,
          itemQty: editForm.itemQty,
          itemPhoto: editForm.itemPhoto,
          status: editForm.status,
          category: editForm.category,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: kitItemsKey });
          queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
          setEditingItem(null);
          toast({ title: "Item updated" });
        },
        onError: () => toast({ variant: "destructive", title: "Failed to update item" }),
      }
    );
  };

  const handleDeleteConfirm = () => {
    if (!deletingItem) return;
    deleteItem.mutate(
      { id: deletingItem.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: kitItemsKey });
          queryClient.invalidateQueries({ queryKey: getListKitsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
          setDeletingItem(null);
          toast({ title: "Item deleted" });
        },
        onError: () => toast({ variant: "destructive", title: "Failed to delete item" }),
      }
    );
  };

  return (
    <div className="bg-muted/20 border-t">
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Items in {kit.kitName}
        </span>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onAddItem}>
          <Plus className="h-3 w-3" /> Add Item
        </Button>
      </div>

      <div className="px-4 pb-3">
        {isLoading ? (
          <div className="space-y-1 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">No items in this kit yet.</p>
        ) : (
          <div className="rounded border overflow-hidden mt-1">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="h-8 text-xs w-[60px]">ID</TableHead>
                  <TableHead className="h-8 text-xs">Item Name</TableHead>
                  <TableHead className="h-8 text-xs w-[60px]">Qty</TableHead>
                  <TableHead className="h-8 text-xs">Photo</TableHead>
                  <TableHead className="h-8 text-xs w-[60px]">Status</TableHead>
                  <TableHead className="h-8 text-xs text-right w-[90px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="bg-white hover:bg-muted/10">
                    <TableCell className="py-1.5 font-mono text-xs text-muted-foreground">{item.itemID}</TableCell>
                    <TableCell className="py-1.5 text-sm font-medium">{item.itemName}</TableCell>
                    <TableCell className="py-1.5 text-sm">{item.itemQty}</TableCell>
                    <TableCell className="py-1.5 text-xs text-muted-foreground font-mono truncate max-w-[140px]">
                      {item.itemPhoto || <span className="italic text-muted-foreground/50">none</span>}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant={item.status === "A" || item.status === "OK" ? "secondary" : "outline"}
                        className="text-[10px] font-mono">
                        {item.status || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => handleEditClick(item)}>
                          <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => setDeletingItem(item)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Edit item dialog */}
      <Dialog open={!!editingItem} onOpenChange={(o) => !o && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Edit Item · {editingItem?.itemID}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="grid gap-1.5">
              <Label>Item Name</Label>
              <Input value={editForm.itemName}
                onChange={(e) => setEditForm((p) => ({ ...p, itemName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Quantity</Label>
                <Input value={editForm.itemQty}
                  onChange={(e) => setEditForm((p) => ({ ...p, itemQty: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Input value={editForm.status}
                  onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Item Photo <span className="font-normal text-muted-foreground">(filename or URL)</span></Label>
              <Input value={editForm.itemPhoto}
                onChange={(e) => setEditForm((p) => ({ ...p, itemPhoto: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Input value={editForm.category}
                onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateItem.isPending}>
              {updateItem.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete item confirmation */}
      <AlertDialog open={!!deletingItem} onOpenChange={(o) => !o && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" /> Delete Item
            </AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deletingItem?.itemName}</strong> ({deletingItem?.itemID}) from this kit?
              Items with higher IDs will be re-numbered automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteItem.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function KitsTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedKitId, setExpandedKitId] = useState<string | null>(null);
  const [editingKit, setEditingKit] = useState<Kit | null>(null);
  const [deletingKit, setDeletingKit] = useState<Kit | null>(null);
  const [addingToKit, setAddingToKit] = useState<Kit | null>(null);
  const [editKitForm, setEditKitForm] = useState({ kitName: "", kitQty: "" });
  const [addItemForm, setAddItemForm] = useState<AddItemForm>({
    itemName: "", itemQty: "", itemPhoto: "",
    status: "A", category: "", kitPhoto: "", kitCode: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: kits = [], isLoading } = useListKits({
    query: { queryKey: getListKitsQueryKey() },
  });

  const updateKit = useUpdateKit();
  const deleteKit = useDeleteKit();
  const addItemToKit = useAddItemToKit();

  const filteredKits = kits.filter(
    (kit) =>
      kit.kitName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kit.kitID.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kit.cubeName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Kit edit handlers
  const handleEditKitClick = (kit: Kit) => {
    setEditingKit(kit);
    setEditKitForm({ kitName: kit.kitName ?? "", kitQty: kit.kitQty ?? "" });
  };

  const handleSaveKitEdit = () => {
    if (!editingKit) return;
    updateKit.mutate(
      { kitId: editingKit.kitCode, data: { kitName: editKitForm.kitName, kitQty: editKitForm.kitQty } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListKitsQueryKey() });
          setEditingKit(null);
          toast({ title: "Kit updated" });
        },
        onError: () => toast({ variant: "destructive", title: "Failed to update kit" }),
      }
    );
  };

  const handleDeleteKitConfirm = () => {
    if (!deletingKit) return;
    deleteKit.mutate(
      { kitId: deletingKit.kitCode },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListKitsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
          setDeletingKit(null);
          if (expandedKitId === compositeKey(deletingKit)) setExpandedKitId(null);
          toast({ title: "Kit deleted" });
        },
        onError: () => toast({ variant: "destructive", title: "Failed to delete kit" }),
      }
    );
  };

  // Add item handlers
  const handleAddItemClick = (kit: Kit) => {
    setAddingToKit(kit);
    setExpandedKitId(kit.kitID);
    setAddItemForm({
      itemName: "", itemQty: "", itemPhoto: "",
      status: "A", category: "",
      kitPhoto: kit.kitPhoto ?? "",
      kitCode: kit.kitCode ?? "",
    });
  };

  const handleAutocompleteSelect = (s: SearchSuggestion) => {
    setAddItemForm((prev) => ({
      ...prev,
      itemName: s.itemName,
      itemPhoto: s.itemPhoto ?? "",
      status: s.status ?? "A",
      category: s.category ?? "",
    }));
  };

  const handleAddItemSave = () => {
    if (!addingToKit) return;
    if (!addItemForm.itemName.trim() || !addItemForm.itemQty.trim()) {
      toast({ variant: "destructive", title: "Item Name and Quantity are required." });
      return;
    }
    addItemToKit.mutate(
      {
        kitId: addingToKit.kitCode,
        data: {
          itemName: addItemForm.itemName.trim(),
          itemQty: addItemForm.itemQty.trim(),
          itemPhoto: addItemForm.itemPhoto.trim(),
          status: addItemForm.status.trim() || "A",
          category: addItemForm.category.trim(),
          kitPhoto: addItemForm.kitPhoto.trim(),
          kitCode: addItemForm.kitCode.trim(),
          cubeName: addingToKit.cubeName,
          boxName: addingToKit.boxName,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListKitsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
          queryClient.invalidateQueries({ queryKey: ["kit-items", addingToKit.kitCode, addingToKit.cubeName, addingToKit.boxName] });
          setAddingToKit(null);
          toast({ title: `Item added to ${addingToKit.kitName}` });
        },
        onError: () => toast({ variant: "destructive", title: "Failed to add item" }),
      }
    );
  };

  const compositeKey = (kit: Kit) => `${kit.kitCode}::${kit.cubeName}::${kit.boxName}`;

  const toggleExpand = (key: string) => {
    setExpandedKitId((prev) => (prev === key ? null : key));
  };

  return (
    <div className="space-y-4">
      {/* Search + count */}
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search kits by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-kits-search"
          />
        </div>
        <div className="text-sm text-muted-foreground font-medium">
          {isLoading ? "Loading..." : `${filteredKits.length} kits found`}
        </div>
      </div>

      {/* Kit table */}
      <div className="border rounded-md bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead className="w-[100px]">Kit ID</TableHead>
              <TableHead>Kit Name</TableHead>
              <TableHead className="w-[50px]">Qty</TableHead>
              <TableHead className="w-[80px]">Items</TableHead>
              <TableHead>Box / Frame</TableHead>
              <TableHead>Cube</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredKits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No kits found.
                </TableCell>
              </TableRow>
            ) : (
              filteredKits.map((kit) => {
                const key = compositeKey(kit);
                const isExpanded = expandedKitId === key;
                return (
                  <Fragment key={key}>
                    {/* Kit row */}
                    <TableRow
                      className="cursor-pointer hover:bg-muted/20"
                      data-testid={`row-kit-${kit.kitCode}-${kit.cubeName}`}
                      onClick={() => toggleExpand(key)}
                    >
                      <TableCell className="pr-0 pl-3">
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        <span className="text-primary/80 font-semibold">{kit.kitCode}</span>
                        <span className="ml-1 text-muted-foreground/50">{kit.kitID}</span>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary shrink-0" />
                          {kit.kitName}
                        </div>
                      </TableCell>
                      <TableCell>{kit.kitQty}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {kit.itemCount} items
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {kit.boxName} / {kit.frameName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          {kit.cubeName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => handleEditKitClick(kit)}
                            data-testid={`button-edit-kit-${kit.kitCode}`}
                          >
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => setDeletingKit(kit)}
                            data-testid={`button-delete-kit-${kit.kitCode}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive/80" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded items panel */}
                    {isExpanded && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={8} className="p-0">
                          <KitItemsPanel
                            kit={kit}
                            onAddItem={() => handleAddItemClick(kit)}
                          />
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

      {/* ── Add Item Dialog ── */}
      <Dialog open={!!addingToKit} onOpenChange={(o) => !o && setAddingToKit(null)}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Item to {addingToKit?.kitName}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Item Details
            </p>

            {/* Auto-assigned ID info */}
            <div className="flex items-center gap-2 text-xs bg-muted/40 border rounded px-3 py-2">
              <span className="text-muted-foreground">Item ID</span>
              <span className="inline-flex items-center rounded bg-primary/10 px-2 py-0.5 text-[11px] font-bold font-mono text-primary border border-primary/20">
                auto-assigned
              </span>
              <span className="text-muted-foreground ml-auto">Next sequential ID in this kit</span>
            </div>

            {/* Item name with autocomplete */}
            <div className="grid gap-1.5">
              <Label>
                Item Name <span className="text-destructive">*</span>
                <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                  — type 3+ letters to search all items
                </span>
              </Label>
              <ItemNameAutocomplete
                value={addItemForm.itemName}
                onChange={(v) => setAddItemForm((p) => ({ ...p, itemName: v }))}
                onSelect={handleAutocompleteSelect}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Quantity <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g. 10"
                  value={addItemForm.itemQty}
                  onChange={(e) => setAddItemForm((p) => ({ ...p, itemQty: e.target.value }))}
                  data-testid="input-add-item-qty"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Input
                  placeholder="A"
                  value={addItemForm.status}
                  onChange={(e) => setAddItemForm((p) => ({ ...p, status: e.target.value }))}
                  data-testid="input-add-item-status"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Input
                placeholder="e.g. Medicine"
                value={addItemForm.category}
                onChange={(e) => setAddItemForm((p) => ({ ...p, category: e.target.value }))}
                data-testid="input-add-item-category"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>
                Item Photo
                <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                  — auto-filled if item found in database
                </span>
              </Label>
              <Input
                placeholder="e.g. bandage.jpg or https://..."
                value={addItemForm.itemPhoto}
                onChange={(e) => setAddItemForm((p) => ({ ...p, itemPhoto: e.target.value }))}
                className={addItemForm.itemPhoto ? "bg-muted/40" : ""}
                data-testid="input-add-item-photo"
              />
            </div>

            {/* Kit details (pre-filled) */}
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mt-1">
              Kit Details
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="flex items-center gap-1">
                  Kit Code
                  <span className="text-[10px] font-normal text-primary/70 bg-primary/10 rounded px-1">auto-filled</span>
                </Label>
                <Input
                  value={addItemForm.kitCode}
                  onChange={(e) => setAddItemForm((p) => ({ ...p, kitCode: e.target.value }))}
                  className={addItemForm.kitCode ? "bg-muted/40" : ""}
                  data-testid="input-add-kit-code"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="flex items-center gap-1">
                  Kit Photo
                  <span className="text-[10px] font-normal text-primary/70 bg-primary/10 rounded px-1">auto-filled</span>
                </Label>
                <Input
                  value={addItemForm.kitPhoto}
                  onChange={(e) => setAddItemForm((p) => ({ ...p, kitPhoto: e.target.value }))}
                  className={addItemForm.kitPhoto ? "bg-muted/40" : ""}
                  data-testid="input-add-kit-photo"
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border border-muted">
              Kit: <strong>{addingToKit?.kitCode}</strong> ({addingToKit?.kitID}) &bull; Box: {addingToKit?.boxName} &bull;
              Frame: {addingToKit?.frameName} &bull; Cube: {addingToKit?.cubeName}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingToKit(null)}>Cancel</Button>
            <Button onClick={handleAddItemSave} disabled={addItemToKit.isPending}
              data-testid="button-save-add-item">
              {addItemToKit.isPending ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Kit Dialog ── */}
      <Dialog open={!!editingKit} onOpenChange={(o) => !o && setEditingKit(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Kit</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Kit Name</Label>
              <Input value={editKitForm.kitName}
                onChange={(e) => setEditKitForm((p) => ({ ...p, kitName: e.target.value }))}
                data-testid="input-edit-kit-name" />
            </div>
            <div className="grid gap-2">
              <Label>Quantity</Label>
              <Input value={editKitForm.kitQty}
                onChange={(e) => setEditKitForm((p) => ({ ...p, kitQty: e.target.value }))}
                data-testid="input-edit-kit-qty" />
            </div>
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border border-muted">
              Kit Code: <strong>{editingKit?.kitCode}</strong> &bull; Kit ID: {editingKit?.kitID} &bull; Items: {editingKit?.itemCount}
              <br /><em>Note: Updates all items belonging to this kit ID.</em>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingKit(null)}>Cancel</Button>
            <Button onClick={handleSaveKitEdit} disabled={updateKit.isPending}
              data-testid="button-save-edit-kit">
              {updateKit.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Kit Dialog ── */}
      <AlertDialog open={!!deletingKit} onOpenChange={(o) => !o && setDeletingKit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" /> Delete Kit
            </AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deletingKit?.kitName}</strong>? This will permanently remove{" "}
              <strong>{deletingKit?.itemCount} items</strong> from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteKitConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-kit">
              {deleteKit.isPending ? "Deleting..." : "Delete Kit & Items"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Shield, Plus, Trash2, Key, ArrowLeft, UserCircle, RefreshCw,
  Eye, EyeOff, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

interface UserRow {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

const SUPER_ADMIN = "pritam9160";

export default function AdminPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [fetching, setFetching] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ username: "", password: "", role: "user" });
  const [addShowPw, setAddShowPw] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ username: "", role: "user" });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [changePwUser, setChangePwUser] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "admin")) navigate("/");
  }, [isLoading, isAuthenticated, user, navigate]);

  const fetchUsers = async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (res.ok) setUsers(await res.json());
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { if (isAuthenticated) fetchUsers(); }, [isAuthenticated]);

  const handleAddUser = async () => {
    if (!addForm.username.trim() || !addForm.password.trim()) return;
    setAddSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: `User "${addForm.username}" created.` });
        setAddOpen(false);
        setAddForm({ username: "", password: "", role: "user" });
        fetchUsers();
      } else {
        toast({ variant: "destructive", title: data.message ?? "Failed to create user." });
      }
    } finally {
      setAddSubmitting(false);
    }
  };

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setEditForm({ username: u.username, role: u.role });
  };

  const handleEditUser = async () => {
    if (!editUser || !editForm.username.trim()) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: `User "${editForm.username}" updated.` });
        setEditUser(null);
        fetchUsers();
      } else {
        toast({ variant: "destructive", title: data.message ?? "Failed to update user." });
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!changePwUser || !newPassword.trim()) return;
    setPwSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${changePwUser.id}/password`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        toast({ title: `Password updated for "${changePwUser.username}".` });
        setChangePwUser(null);
        setNewPassword("");
      } else {
        toast({ variant: "destructive", title: "Failed to update password." });
      }
    } finally {
      setPwSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    const res = await fetch(`/api/admin/users/${deleteUser.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) {
      toast({ title: `User "${deleteUser.username}" deleted.` });
      setDeleteUser(null);
      fetchUsers();
    } else {
      toast({ variant: "destructive", title: data.message ?? "Failed to delete user." });
    }
  };

  if (isLoading) return null;

  const isSuperAdmin = (u: UserRow) => u.username.toLowerCase() === SUPER_ADMIN.toLowerCase();

  return (
    <div className="min-h-screen aurora-bg">
      <header
        className="sticky top-0 z-10 border-b"
        style={{
          background: "rgba(11, 16, 50, 0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderColor: "rgba(255,255,255,0.07)",
        }}
      >
        <div className="container max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground transition-colors mr-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div
              className="p-2 rounded-xl"
              style={{ background: "linear-gradient(135deg, #3d72f0, #1ccfc8)" }}
            >
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight gradient-text">Admin Panel</h1>
              <p className="text-[11px] text-muted-foreground leading-none">User Management</p>
            </div>
          </div>
          <Button
            onClick={() => { setAddForm({ username: "", password: "", role: "user" }); setAddShowPw(false); setAddOpen(true); }}
            size="sm"
            className="gap-2 gradient-button rounded-xl text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" /> Add User
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div
          className="glass-card rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <h2 className="font-semibold text-foreground text-sm">Users ({users.length})</h2>
            <button
              onClick={fetchUsers}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="divide-y divide-border/30">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center h-9 w-9 rounded-full"
                    style={{
                      background: isSuperAdmin(u)
                        ? "rgba(200,138,24,0.15)"
                        : "rgba(74,122,242,0.15)",
                      border: isSuperAdmin(u)
                        ? "1px solid rgba(200,138,24,0.35)"
                        : "1px solid rgba(74,122,242,0.25)",
                    }}
                  >
                    <UserCircle
                      className="h-6 w-6"
                      style={{ color: isSuperAdmin(u) ? "#c88a18" : undefined }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">{u.username}</span>
                      {isSuperAdmin(u) && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          super admin
                        </Badge>
                      )}
                      <Badge
                        variant={u.role === "admin" ? "default" : "outline"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {u.role}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID #{u.id} · Created {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(u)}
                    disabled={isSuperAdmin(u) && u.id !== user?.id}
                    className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setChangePwUser(u); setNewPassword(""); setShowNewPw(false); }}
                    className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Key className="h-3.5 w-3.5" /> Password
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteUser(u)}
                    disabled={u.id === user?.id || isSuperAdmin(u)}
                    className="text-destructive/50 hover:text-destructive hover:bg-destructive/10"
                    title={isSuperAdmin(u) ? "Cannot delete super admin" : "Delete user"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {!fetching && users.length === 0 && (
              <div className="px-6 py-12 text-center text-muted-foreground text-sm">No users found.</div>
            )}
          </div>
        </div>
      </main>

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input
                placeholder="username"
                value={addForm.username}
                onChange={(e) => setAddForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={addShowPw ? "text" : "password"}
                  placeholder="password"
                  value={addForm.password}
                  onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                  className="pr-10"
                />
                <button type="button" onClick={() => setAddShowPw((v) => !v)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                  {addShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <select
                value={addForm.role}
                onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full h-9 rounded-md border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddUser}
              disabled={addSubmitting || !addForm.username.trim() || !addForm.password.trim()}
            >
              {addSubmitting ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User — {editUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input
                placeholder="username"
                value={editForm.username}
                onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                disabled={editUser ? isSuperAdmin(editUser) : false}
              />
              {editUser && isSuperAdmin(editUser) && (
                <p className="text-xs text-muted-foreground">Super admin username cannot be changed.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                disabled={editUser ? isSuperAdmin(editUser) : false}
                className="w-full h-9 rounded-md border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button
              onClick={handleEditUser}
              disabled={editSubmitting || !editForm.username.trim() || (editUser ? isSuperAdmin(editUser) : false)}
            >
              {editSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={!!changePwUser} onOpenChange={(o) => { if (!o) setChangePwUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password — {changePwUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>New Password</Label>
            <div className="relative">
              <Input
                type={showNewPw ? "text" : "password"}
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
              />
              <button type="button" onClick={() => setShowNewPw((v) => !v)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePwUser(null)}>Cancel</Button>
            <Button onClick={handleChangePassword} disabled={pwSubmitting || !newPassword.trim()}>
              {pwSubmitting ? "Saving…" : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => { if (!o) setDeleteUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteUser?.username}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

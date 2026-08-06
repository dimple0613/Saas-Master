"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, MoreVertical, Pencil, Shield, Users, LogIn, Ban, EyeOff } from "lucide-react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

interface Admin {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  status: string;
  adminGroup: { id: number; name: string } | null;
  createdAt: string;
}

interface AdminGroup {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  userCount: number;
}

export default function AdminsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const permissions = session?.user?.permissions || [];
  const canManage = permissions.includes("admin.manage");
  const canImpersonate = permissions.includes("impersonate");

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Admin | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Admin | null>(null);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    role: "admin",
    adminGroupId: "",
  });

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AdminGroup | null>(null);
  const [busyGroup, setBusyGroup] = useState(false);
  const [deleteGroup, setDeleteGroup] = useState<AdminGroup | null>(null);
  const [groupForm, setGroupForm] = useState({ name: "", description: "" });

  async function load() {
    try {
      const [adminsRes, groupsRes] = await Promise.all([fetch("/api/admins"), fetch("/api/admin-groups")]);
      if (adminsRes.ok) setAdmins((await adminsRes.json()).admins || []);
      if (groupsRes.ok) setGroups((await groupsRes.json()).groups || []);
    } catch {
      setError("Failed to load admins");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return admins.filter((a) => {
      if (tab === "active" && a.status !== "active") return false;
      if (tab === "inactive" && a.status === "active") return false;
      if (q && !`${a.firstName || ""} ${a.lastName || ""} ${a.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [admins, tab, search]);

  const counts = useMemo(
    () => ({
      total: admins.length,
      active: admins.filter((a) => a.status === "active").length,
      inactive: admins.length - admins.filter((a) => a.status === "active").length,
    }),
    [admins]
  );

  function openCreate() {
    setEditing(null);
    setForm({ email: "", firstName: "", lastName: "", password: "", role: "admin", adminGroupId: "" });
    setError("");
    setShowForm(true);
  }

  function openEdit(item: Admin) {
    setEditing(item);
    setForm({
      email: item.email,
      firstName: item.firstName || "",
      lastName: item.lastName || "",
      password: "",
      role: item.role,
      adminGroupId: item.adminGroup ? String(item.adminGroup.id) : "",
    });
    setError("");
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(editing ? `/api/admins/${editing.id}` : "/api/admins", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          ...(form.password ? { password: form.password } : {}),
          role: form.role,
          adminGroupId: form.adminGroupId ? parseInt(form.adminGroupId) : null,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Something went wrong");
        setBusy(false);
        return;
      }
      setShowForm(false);
      await load();
    } catch {
      setError("Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function loginAs(item: Admin) {
    setError("");
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: item.id }),
    });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || "Failed to sign in as admin");
      return;
    }
    router.push(d.redirect || "/admin");
    router.refresh();
  }

  async function toggleStatus(item: Admin) {
    const next = item.status === "active" ? "inactive" : "active";
    await fetch(`/api/admins/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    await load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admins/${deleteTarget.id}`, { method: "DELETE" });
    const d = await res.json();
    if (!res.ok) setError(d.error || "Failed to delete admin");
    setDeleteTarget(null);
    await load();
  }

  function openGroupCreate() {
    setEditingGroup(null);
    setGroupForm({ name: "", description: "" });
    setError("");
    setShowGroupForm(true);
  }

  function openGroupEdit(item: AdminGroup) {
    setEditingGroup(item);
    setGroupForm({ name: item.name, description: item.description || "" });
    setError("");
    setShowGroupForm(true);
  }

  async function submitGroup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusyGroup(true);
    try {
      const res = await fetch(editingGroup ? `/api/admin-groups/${editingGroup.id}` : "/api/admin-groups", {
        method: editingGroup ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupForm),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Something went wrong");
        setBusyGroup(false);
        return;
      }
      setShowGroupForm(false);
      await load();
    } catch {
      setError("Something went wrong");
    } finally {
      setBusyGroup(false);
    }
  }

  async function confirmDeleteGroup() {
    if (!deleteGroup) return;
    const res = await fetch(`/api/admin-groups/${deleteGroup.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Failed to delete group");
    }
    setDeleteGroup(null);
    await load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const statItems = [
    { title: "Total Admins", value: counts.total, icon: Users },
    { title: "Active", value: counts.active, icon: Shield },
    { title: "Inactive", value: counts.inactive, icon: Ban },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Admins</h1>
          <AppBreadcrumb />
        </div>
        {canManage && (
          <Button onClick={openCreate} className="h-8 gap-1.5 px-2.5">
            <Plus className="h-4 w-4" /> New Admin
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statItems.map((item) => (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                {(() => { const Icon = item.icon; return <Icon className="h-4 w-4 text-primary" />; })()}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Admin Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                className="h-9 w-full sm:max-w-xs"
                placeholder="Search admins..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="inactive">Inactive</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No admins found.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">Admin</th>
                      <th className="px-3 py-2.5 font-medium">Group</th>
                      <th className="px-3 py-2.5 font-medium">Role</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-3 py-2.5 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr key={item.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                              {`${item.firstName || ""} ${item.lastName || ""}`.trim().split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "A"}
                            </div>
                            <div>
                              <div className="font-medium text-foreground">
                                {`${item.firstName || ""} ${item.lastName || ""}`.trim() || item.email}
                              </div>
                              <div className="text-xs text-muted-foreground">{item.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {item.adminGroup ? (
                            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{item.adminGroup.name}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-sm capitalize text-foreground">{item.role.replace("_", " ")}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                              item.status === "active"
                                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canImpersonate && item.id !== (session?.user?.id ? parseInt(session.user.id) : -1) && (
                                  <DropdownMenuItem onClick={() => loginAs(item)}>
                                    <LogIn className="h-4 w-4" /> Login As
                                  </DropdownMenuItem>
                                )}
                                {canManage && (
                                  <DropdownMenuItem onClick={() => openEdit(item)}>
                                    <Pencil className="h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                )}
                                {canManage && item.id !== (session?.user?.id ? parseInt(session.user.id) : -1) && (
                                  <DropdownMenuItem onClick={() => toggleStatus(item)}>
                                    {item.status === "active" ? <Ban className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                    {item.status === "active" ? "Deactivate" : "Activate"}
                                  </DropdownMenuItem>
                                )}
                                {canManage && item.id !== (session?.user?.id ? parseInt(session.user.id) : -1) && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(item)}>
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Admin Groups</CardTitle>
            {canManage && (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2" onClick={openGroupCreate}>
                <Plus className="h-4 w-4" /> New Group
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No groups yet.</p>
            ) : (
              groups.map((g) => (
                <div key={g.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {g.name}
                      {!g.isActive && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">Inactive</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {g.description || "—"} · {g.userCount} admin{g.userCount === 1 ? "" : "s"}
                    </div>
                  </div>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openGroupEdit(g)}>
                          <Pencil className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleteGroup(g)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Admin" : "Add Admin"}</DialogTitle>
          </DialogHeader>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">First name</Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Last name</Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-foreground">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-foreground">
                {editing ? "New password (leave blank to keep)" : "Password"}
              </Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: String(v) })}>
                  <SelectTrigger className="w-full">
                    <span className="capitalize">{form.role.replace("_", " ")}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Group</Label>
                <Select
                  value={form.adminGroupId}
                  onValueChange={(v) => setForm({ ...form, adminGroupId: String(v) })}
                >
                  <SelectTrigger className="w-full">
                    <span>{form.adminGroupId ? groups.find((g) => g.id === parseInt(form.adminGroupId))?.name || "Select" : "Select"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showGroupForm} onOpenChange={(o) => { if (!o) setShowGroupForm(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Group" : "Add Group"}</DialogTitle>
          </DialogHeader>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          <form onSubmit={submitGroup} className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-foreground">Name</Label>
              <Input value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} required />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-foreground">Description</Label>
              <Input
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowGroupForm(false)}>Cancel</Button>
              <Button type="submit" disabled={busyGroup}>{busyGroup ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete admin"
        description={
          deleteTarget ? `Are you sure you want to deactivate the admin "${deleteTarget.email}"? They will be moved to inactive customers.` : undefined
        }
        confirmLabel="Deactivate"
        destructive
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={deleteGroup !== null}
        onOpenChange={(open) => { if (!open) setDeleteGroup(null); }}
        title="Delete group"
        description={
          deleteGroup
            ? `Are you sure you want to delete the group "${deleteGroup.name}"? Admins in this group will be unassigned.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDeleteGroup}
      />
    </div>
  );
}

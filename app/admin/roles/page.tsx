"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ShieldCheck, Shield, ShieldOff, Plus, MoreVertical, Pencil } from "lucide-react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

interface Role {
  id: number;
  scope: string;
  name: string;
  label: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  users: number;
  permissionKeys: string[];
}

interface PermissionDef {
  key: string;
  label: string;
}

export default function RolesPage() {
  const { data: session } = useSession();
  const canManage = (session?.user?.permissions || []).includes("roles.manage");

  const [roles, setRoles] = useState<Role[]>([]);
  const [perms, setPerms] = useState<{ system: PermissionDef[]; tenant: PermissionDef[] }>({
    system: [],
    tenant: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const [form, setForm] = useState({
    scope: "system",
    name: "",
    label: "",
    description: "",
    isActive: true,
    permissions: [] as string[],
  });

  async function load() {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch("/api/roles"),
        fetch("/api/permissions"),
      ]);
      if (rolesRes.ok) {
        const data = await rolesRes.json();
        setRoles(data.roles || []);
      }
      if (permsRes.ok) {
        const data = await permsRes.json();
        setPerms(data.permissions || { system: [], tenant: [] });
      }
    } catch {
      setError("Failed to load roles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roles.filter((r) => {
      if (statusFilter === "active" && !r.isActive) return false;
      if (statusFilter === "inactive" && r.isActive) return false;
      if (!q) return true;
      return (
        r.label.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        r.scope.includes(q)
      );
    });
  }, [roles, search, statusFilter]);

  const counts = useMemo(() => {
    return {
      total: roles.length,
      active: roles.filter((r) => r.isActive).length,
      inactive: roles.filter((r) => !r.isActive).length,
    };
  }, [roles]);

  const scopePerms = form.scope === "system" ? perms.system : perms.tenant;

  function openCreate() {
    setEditing(null);
    setForm({ scope: "system", name: "", label: "", description: "", isActive: true, permissions: [] });
    setError("");
    setShowForm(true);
  }

  function openEdit(role: Role) {
    setEditing(role);
    setForm({
      scope: role.scope,
      name: role.name,
      label: role.label,
      description: role.description || "",
      isActive: role.isActive,
      permissions: [...role.permissionKeys],
    });
    setError("");
    setShowForm(true);
  }

  function togglePermission(key: string, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      permissions: checked
        ? Array.from(new Set([...prev.permissions, key]))
        : prev.permissions.filter((k) => k !== key),
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const url = editing ? `/api/roles/${editing.id}` : "/api/roles";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: form.scope,
          name: form.name,
          label: form.label,
          description: form.description,
          isActive: form.isActive,
          permissions: form.permissions,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
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

  async function toggleActive(role: Role) {
    await fetch(`/api/roles/${role.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !role.isActive }),
    });
    await load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/roles/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    await load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const statItems = [
    { title: "Total Roles", value: counts.total, icon: ShieldCheck },
    { title: "Active", value: counts.active, icon: Shield },
    { title: "Inactive", value: counts.inactive, icon: ShieldOff },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Roles & Permissions
          </h1>
          <AppBreadcrumb />
        </div>
        {canManage && (
          <Button onClick={openCreate} className="h-8 gap-1.5 px-2.5">
            <Plus className="h-4 w-4" /> New Role
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

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search roles..."
          className="w-full sm:w-64"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(String(v))}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <span>{statusFilter === "all" ? "All Status" : statusFilter === "active" ? "Active" : "Inactive"}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No roles found.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Role Name</th>
                <th className="px-4 py-2.5 font-medium">Scope</th>
                <th className="px-4 py-2.5 font-medium">Permissions</th>
                <th className="px-4 py-2.5 font-medium">Users</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((role) => (
                <tr key={role.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-foreground">{role.label}</p>
                    <p className="text-xs text-muted-foreground">{role.name}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium capitalize text-primary">
                      {role.scope}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-muted-foreground">{role.permissionKeys.length} permissions</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{role.users}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        role.isActive
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {role.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {canManage ? (
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(role)}>
                              <Pencil className="h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleActive(role)}>
                              {role.isActive ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                              {role.isActive ? "Disable" : "Enable"}
                            </DropdownMenuItem>
                            {!role.isDefault && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(role)}>
                                  Remove
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(role)} aria-label="View role">
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Role" : "Create Role"}</DialogTitle>
          </DialogHeader>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Scope</Label>
                <Select
                  value={form.scope}
                  onValueChange={(v) => setForm((p) => ({ ...p, scope: String(v), permissions: [] }))}
                >
                  <SelectTrigger className="w-full">
                    <span className="capitalize">{form.scope}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Role Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="support_agent"
                  required
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-foreground">Label</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Support Agent"
                required
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-foreground">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Optional description"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-sm text-foreground">Active</span>
              <Switch
                checked={form.isActive}
                onCheckedChange={(c) => setForm({ ...form, isActive: Boolean(c) })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-foreground">
                Permissions ({scopePerms.length})
              </Label>
              {scopePerms.length === 0 ? (
                <p className="text-sm text-muted-foreground">No permissions for this scope.</p>
              ) : (
                <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2">
                  {scopePerms.map((p) => (
                    <label
                      key={p.key}
                      className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-foreground transition-colors hover:bg-accent"
                    >
                      <Checkbox
                        checked={form.permissions.includes(p.key)}
                        onCheckedChange={(checked) => togglePermission(p.key, Boolean(checked))}
                      />
                      <span className="truncate">{p.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Remove role"
        description={
          deleteTarget
            ? `Are you sure you want to remove the role "${deleteTarget.label}"? This cannot be undone.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, MoreVertical, Pencil, Coins } from "lucide-react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

interface CreditPackage {
  id: number;
  name: string;
  credits: number;
  price: string;
  isVisible: boolean;
  isActive: boolean;
}

export default function CreditPackagesPage() {
  const { data: session } = useSession();
  const canManage = (session?.user?.permissions || []).includes("credit.manage");

  const [items, setItems] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CreditPackage | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CreditPackage | null>(null);
  const [form, setForm] = useState({ name: "", credits: "", price: "", isVisible: true, isActive: true });

  async function load() {
    try {
      const res = await fetch("/api/credit-packages");
      if (res.ok) {
        const d = await res.json();
        setItems(d.packages || []);
      }
    } catch {
      setError("Failed to load credit packages");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((p) =>
        visibilityFilter === "visible"
          ? p.isVisible
          : visibilityFilter === "hidden"
            ? !p.isVisible
            : true
      ),
    [items, visibilityFilter]
  );

  const counts = useMemo(
    () => ({
      total: items.length,
      visible: items.filter((p) => p.isVisible).length,
      hidden: items.length - items.filter((p) => p.isVisible).length,
    }),
    [items]
  );

  const currencySymbol = useMemo(() => {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? "$";
    } catch {
      return "$";
    }
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", credits: "", price: "", isVisible: true, isActive: true });
    setError("");
    setShowForm(true);
  }

  function openEdit(item: CreditPackage) {
    setEditing(item);
    setForm({
      name: item.name,
      credits: String(item.credits),
      price: item.price,
      isVisible: item.isVisible,
      isActive: item.isActive,
    });
    setError("");
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(editing ? `/api/credit-packages/${editing.id}` : "/api/credit-packages", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          credits: form.credits,
          price: form.price,
          isVisible: form.isVisible,
          isActive: form.isActive,
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

  async function toggleVisible(item: CreditPackage) {
    await fetch(`/api/credit-packages/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible: !item.isVisible }),
    });
    await load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/credit-packages/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    await load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const statItems = [
    { title: "Total Packages", value: counts.total, icon: Coins },
    { title: "Visible", value: counts.visible, icon: Coins },
    { title: "Hidden", value: counts.hidden, icon: Coins },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Credit Packages</h1>
          <AppBreadcrumb />
        </div>
        {canManage && (
          <Button onClick={openCreate} className="h-8 gap-1.5 px-2.5">
            <Plus className="h-4 w-4" /> New Package
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
        <Select value={visibilityFilter} onValueChange={(v) => setVisibilityFilter(String(v))}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <span>
              {visibilityFilter === "all" ? "All Packages" : visibilityFilter === "visible" ? "Visible" : "Hidden"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Packages</SelectItem>
            <SelectItem value="visible">Visible</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No credit packages found.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Credits</th>
                <th className="px-4 py-2.5 font-medium">Price</th>
                <th className="px-4 py-2.5 font-medium">Visibility</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Coins className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-foreground">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-semibold text-foreground">{item.credits.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-semibold text-foreground">
                      {currencySymbol}{Number(item.price).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        item.isVisible
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.isVisible ? "Visible" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleVisible(item)}>
                            {item.isVisible ? "Hide" : "Show"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(item)}>
                            Delete
                          </DropdownMenuItem>
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

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Package" : "Add Package"}</DialogTitle>
          </DialogHeader>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-foreground">Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Starter" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Credits</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.credits}
                  onChange={(e) => setForm({ ...form, credits: e.target.value })}
                  placeholder="1000"
                  required
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Price (USD)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="10.00"
                  required
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-sm text-foreground">Visible to customers</span>
              <Switch checked={form.isVisible} onCheckedChange={(c) => setForm({ ...form, isVisible: Boolean(c) })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-sm text-foreground">Active</span>
              <Switch checked={form.isActive} onCheckedChange={(c) => setForm({ ...form, isActive: Boolean(c) })} />
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
        title="Delete credit package"
        description={
          deleteTarget ? `Are you sure you want to delete the package "${deleteTarget.name}"? This cannot be undone.` : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}

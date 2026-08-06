"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Trash2, ShieldOff, Ban } from "lucide-react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

interface Entry {
  id: number;
  emailOrDomain: string;
  reason: string | null;
  createdAt: string;
}

export default function BlacklistPage() {
  const { data: session } = useSession();
  const canView = (session?.user?.permissions || []).includes("log.view");

  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);
  const [form, setForm] = useState({ emailOrDomain: "", reason: "" });

  async function load() {
    try {
      const res = await fetch("/api/logs/blacklist");
      if (res.ok) {
        const d = await res.json();
        setItems(d.entries || []);
      }
    } catch {
      setError("Failed to load blacklist");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.emailOrDomain.toLowerCase().includes(q) || (i.reason || "").toLowerCase().includes(q));
  }, [items, search]);

  const counts = useMemo(
    () => ({
      total: items.length,
      emails: items.filter((i) => i.emailOrDomain.includes("@")).length,
      domains: items.length - items.filter((i) => i.emailOrDomain.includes("@")).length,
    }),
    [items]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/logs/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Something went wrong");
        setBusy(false);
        return;
      }
      setShowForm(false);
      setForm({ emailOrDomain: "", reason: "" });
      await load();
    } catch {
      setError("Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/logs/blacklist/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    await load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const statItems = [
    { title: "Total Blocked", value: counts.total, icon: ShieldOff },
    { title: "Emails", value: counts.emails, icon: Ban },
    { title: "Domains", value: counts.domains, icon: Ban },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Email Blacklist</h1>
          <AppBreadcrumb />
        </div>
        {canView && (
          <Button onClick={() => setShowForm(true)} className="h-8 gap-1.5 px-2.5">
            <Plus className="h-4 w-4" /> Block Email
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
          className="h-9 w-full sm:max-w-xs"
          placeholder="Search blacklist..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No blacklist entries found.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Email / Domain</th>
                <th className="px-4 py-2.5 font-medium">Reason</th>
                <th className="px-4 py-2.5 font-medium">Added</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                        <ShieldOff className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-foreground">{item.emailOrDomain}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{item.reason || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(item)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
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
            <DialogTitle>Block Email or Domain</DialogTitle>
          </DialogHeader>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-foreground">Email or domain</Label>
              <Input
                value={form.emailOrDomain}
                onChange={(e) => setForm({ ...form, emailOrDomain: e.target.value })}
                placeholder="user@example.com or example.com"
                required
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-foreground">Reason</Label>
              <Input
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Spam / bounced"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Adding..." : "Block"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Unblock email"
        description={
          deleteTarget
            ? `Are you sure you want to remove "${deleteTarget.emailOrDomain}" from the blacklist?`
            : undefined
        }
        confirmLabel="Unblock"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, CreditCard, MoreVertical, Pencil, Trash2, ShieldOff, Shield } from "lucide-react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

interface Plan {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: string;
  currency: string;
  billingCycle: string;
  trialDays: number | null;
  requiresPayment: boolean;
  isActive: boolean;
  features: { key: string; label: string; value: string | null }[];
}

interface Subscription {
  id: number;
  org: { id: number; name: string; status: string };
  plan: { id: number; name: string; slug: string; priceMonthly: string };
  status: string;
  startsAt: string;
  endsAt: string | null;
}

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  priceMonthly: "0",
  currency: "USD",
  billingCycle: "monthly",
  trialDays: "",
  requiresPayment: true,
  isActive: true,
  features: "",
};

export default function PlansPage() {
  const { data: session } = useSession();
  const canManage = (session?.user?.permissions || []).includes("plan.manage");

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });

  async function load() {
    try {
      const [plansRes, subsRes] = await Promise.all([
        fetch("/api/plans"),
        fetch("/api/subscriptions"),
      ]);
      const plansData = await plansRes.json();
      const subsData = await subsRes.json();
      setPlans(plansData.plans || []);
      setSubscriptions(subsData.subscriptions || []);
    } catch {
      setError("Failed to load plans");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const activePlans = plans.filter((p) => p.isActive);
    const totalRevenue = subscriptions
      .filter((s) => s.status === "active" || s.status === "trialing")
      .reduce((sum, s) => sum + parseFloat(s.plan.priceMonthly || "0"), 0);
    return {
      total: plans.length,
      active: activePlans.length,
      inactive: plans.length - activePlans.length,
      subscribers: subscriptions.filter((s) => s.status === "active").length,
      mrr: totalRevenue,
    };
  }, [plans, subscriptions]);

  function parseFeatures(raw: string) {
    return raw
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, value] = line.split(":").map((s) => s.trim());
        return { key: label.toLowerCase().replace(/\s+/g, "_"), label, value: value || null };
      });
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setShowForm(true);
  }

  function openEdit(plan: Plan) {
    setEditing(plan);
    setForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || "",
      priceMonthly: plan.priceMonthly,
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      trialDays: plan.trialDays != null ? String(plan.trialDays) : "",
      requiresPayment: plan.requiresPayment,
      isActive: plan.isActive,
      features: plan.features.map((f) => (f.value ? `${f.label}: ${f.value}` : f.label)).join("\n"),
    });
    setError("");
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const url = editing ? `/api/plans/${editing.id}` : "/api/plans";
      const method = editing ? "PUT" : "POST";
      const body = {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        priceMonthly: parseFloat(form.priceMonthly) || 0,
        currency: form.currency || "USD",
        billingCycle: form.billingCycle,
        trialDays: form.trialDays === "" ? null : parseInt(form.trialDays),
        requiresPayment: form.requiresPayment,
        isActive: form.isActive,
        features: parseFeatures(form.features),
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  async function toggleActive(plan: Plan) {
    await fetch(`/api/plans/${plan.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !plan.isActive }),
    });
    await load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/plans/${deleteTarget.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to delete plan");
      setDeleteTarget(null);
      return;
    }
    setDeleteTarget(null);
    await load();
  }

  async function changePlan(subscriptionId: number, planId: number) {
    const orgId = subscriptions.find((s) => s.id === subscriptionId)?.org.id;
    if (!orgId) return;
    const res = await fetch("/api/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, planId }),
    });
    if (res.ok) await load();
  }

  const statusVariant = (status: string) =>
    status === "active"
      ? "default"
      : status === "trialing"
        ? "secondary"
        : status === "past_due" || status === "expired" || status === "canceled"
          ? "destructive"
          : "outline";

  const statItems = [
    { title: "Total Plans", value: stats.total },
    { title: "Active Plans", value: stats.active },
    { title: "Inactive Plans", value: stats.inactive },
    { title: "Active Subscribers", value: stats.subscribers },
    { title: "Est. MRR", value: `$${stats.mrr.toLocaleString()}` },
  ];

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Plans & Subscriptions
          </h1>
          <AppBreadcrumb />
        </div>
        {canManage && (
          <Button onClick={openCreate} className="h-8 gap-1.5 px-2.5">
            <Plus className="h-4 w-4" /> New Plan
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statItems.map((item) => (
          <div key={item.title} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{item.title}</p>
            <p className="mt-1 text-xl font-bold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Plans */}
      <div className="mb-8">
        <h2 className="font-heading mb-3 text-sm font-semibold text-foreground">Plans</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.length === 0 && (
            <p className="text-sm text-muted-foreground">No plans found.</p>
          )}
          {plans.map((plan) => (
            <div key={plan.id} className={`rounded-lg border border-border bg-card p-4 ${!plan.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                    <p className="text-[11px] text-muted-foreground">{plan.slug}</p>
                  </div>
                </div>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(plan)}>
                        <Pencil className="h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActive(plan)}>
                        {plan.isActive ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                        {plan.isActive ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(plan)}>
                        <Trash2 className="h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              {plan.description && (
                <p className="mt-2 text-xs text-muted-foreground">{plan.description}</p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <p className="text-lg font-semibold text-foreground">
                  {plan.currency} {plan.priceMonthly}
                  <span className="text-xs font-normal text-muted-foreground">
                    /{plan.billingCycle === "yearly" ? "yr" : "mo"}
                  </span>
                </p>
                <div className="ml-auto flex items-center gap-1.5">
                  {plan.trialDays ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {plan.trialDays}-day trial
                    </span>
                  ) : (
                    !plan.requiresPayment && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Free
                      </span>
                    )
                  )}
                  {!plan.isActive && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
              {plan.features.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {plan.features.map((f) => (
                    <li key={f.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="h-1 w-1 rounded-full bg-primary" />
                      {f.label}
                      {f.value && <span className="text-foreground">— {f.value}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Subscriptions */}
      <div>
        <h2 className="font-heading mb-3 text-sm font-semibold text-foreground">Subscriptions</h2>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subscriptions found.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Organization</th>
                  <th className="px-4 py-2.5 font-medium">Plan</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Ends</th>
                  {canManage && <th className="px-4 py-2.5 font-medium">Change Plan</th>}
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">{sub.org.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{sub.org.status}</p>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{sub.plan.name}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={statusVariant(sub.status) as "default" | "secondary" | "destructive" | "outline"}>
                        {sub.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {sub.endsAt ? new Date(sub.endsAt).toLocaleDateString() : "—"}
                    </td>
                    {canManage && (
                      <td className="px-4 py-2.5">
                        <Select
                          value={String(sub.plan.id)}
                          onValueChange={(val) => changePlan(Number(sub.id), parseInt(String(val)))}
                        >
                          <SelectTrigger className="h-8 w-36 text-xs">
                            <span>{sub.plan.name}</span>
                          </SelectTrigger>
                          <SelectContent>
                            {plans.filter((p) => p.isActive).map((plan) => (
                              <SelectItem key={plan.id} value={String(plan.id)}>
                                {plan.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Plan Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Plan" : "Create Plan"}</DialogTitle>
          </DialogHeader>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pro" required autoFocus />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="pro" required />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-foreground">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Price</Label>
                <Input type="number" min="0" step="0.01" value={form.priceMonthly} onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })} required />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Currency</Label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="USD" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Billing Cycle</Label>
                <Select value={form.billingCycle} onValueChange={(v) => setForm({ ...form, billingCycle: String(v) })}>
                  <SelectTrigger className="w-full">
                    <span className="capitalize">{form.billingCycle}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Trial Days</Label>
                <Input type="number" min="0" value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="text-sm text-foreground">Requires payment</span>
                <Switch checked={form.requiresPayment} onCheckedChange={(c) => setForm({ ...form, requiresPayment: Boolean(c) })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="text-sm text-foreground">Active</span>
                <Switch checked={form.isActive} onCheckedChange={(c) => setForm({ ...form, isActive: Boolean(c) })} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-foreground">Features</Label>
              <Textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} rows={3} placeholder={'One per line, "Label: Value"\ne.g.\nTeam members: 25\nStorage: 25 GB'} />
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
        title="Delete plan"
        description={
          deleteTarget
            ? `Are you sure you want to delete the plan "${deleteTarget.name}"? This cannot be undone. Plans with active subscriptions cannot be deleted.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}

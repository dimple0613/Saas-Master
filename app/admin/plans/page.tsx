"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, CreditCard } from "lucide-react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";

interface Plan {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: string;
  currency: string;
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

export default function PlansPage() {
  const { data: session } = useSession();
  const canManage = (session?.user?.permissions || []).includes("plan.manage");

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    priceMonthly: "0",
    currency: "USD",
    features: "",
  });

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

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const features = form.features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean)
        .map((line) => {
          const [label, value] = line.split(":").map((s) => s.trim());
          return { key: label.toLowerCase().replace(/\s+/g, "_"), label, value: value || null };
        });

      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          description: form.description || null,
          priceMonthly: parseFloat(form.priceMonthly) || 0,
          currency: form.currency || "USD",
          features,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setBusy(false);
        return;
      }
      setForm({ name: "", slug: "", description: "", priceMonthly: "0", currency: "USD", features: "" });
      setShowCreate(false);
      await load();
    } catch {
      setError("Something went wrong");
    } finally {
      setBusy(false);
    }
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
          <Button onClick={() => setShowCreate(true)} className="h-8 gap-1.5 px-2.5">
            <Plus className="h-4 w-4" /> New Plan
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {/* Plans */}
      <div className="mb-8">
        <h2 className="font-heading mb-3 text-sm font-semibold text-foreground">Plans</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.length === 0 && (
            <p className="text-sm text-muted-foreground">No plans found.</p>
          )}
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-lg border border-border bg-card p-4">
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
              </div>
              {plan.description && (
                <p className="mt-2 text-xs text-muted-foreground">{plan.description}</p>
              )}
              <p className="mt-3 text-lg font-semibold text-foreground">
                {plan.currency} {plan.priceMonthly}
                <span className="text-xs font-normal text-muted-foreground">/mo</span>
              </p>
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
                            {plans.map((plan) => (
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

      {/* Create Plan Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) setShowCreate(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Plan</DialogTitle>
          </DialogHeader>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          <form onSubmit={createPlan} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Name</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pro" required autoFocus />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Slug</label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="pro" required />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Price / month</label>
                <Input type="number" min="0" step="0.01" value={form.priceMonthly} onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Currency</label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="USD" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Features</label>
              <Textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} rows={3} placeholder={'One per line, "Label: Value"\ne.g.\nTeam members: 25\nStorage: 25 GB'} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Creating..." : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

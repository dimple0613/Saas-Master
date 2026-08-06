"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { MoreVertical, RefreshCw, Power, Ban, DollarSign, Users, Repeat, AlarmClock } from "lucide-react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { TablePagination } from "@/components/tables/table-pagination";

interface OrgBrief {
  id: number;
  name: string;
  status: string;
}

interface PlanBrief {
  id: number;
  name: string;
  slug: string;
  priceMonthly: number;
  billingCycle: string;
  currency: string;
}

interface Subscription {
  id: number;
  org: OrgBrief;
  plan: PlanBrief;
  status: string;
  autoRenew: boolean;
  credits: number;
  startsAt: string;
  endsAt: string | null;
}

const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

export default function SubscriptionsPage() {
  const { data: session } = useSession();
  const canManage = (session?.user?.permissions || []).includes("subscription.manage");

  const [items, setItems] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [recurringFilter, setRecurringFilter] = useState("all");
  const [now, setNow] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [terminateTarget, setTerminateTarget] = useState<Subscription | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/subscriptions");
      if (res.ok) {
        const d = await res.json();
        setItems(d.subscriptions || []);
        setNow(Date.now());
      }
    } catch {
      setError("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const plans = useMemo(() => {
    const seen = new Map<number, string>();
    for (const s of items) if (!seen.has(s.plan.id)) seen.set(s.plan.id, s.plan.name);
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [items]);

  const stats = useMemo(() => {
    const active = items.filter((s) => s.status === "active");
    const mrr = active.reduce((sum, s) => sum + s.plan.priceMonthly, 0);
    const autoRenewing = items.filter((s) => s.autoRenew && s.status !== "canceled").length;
    const endingSoon = items.filter((s) => {
      if (!s.endsAt) return false;
      const end = new Date(s.endsAt).getTime();
      return end > now && end <= now + 7 * 24 * 60 * 60 * 1000;
    }).length;
    return { mrr, activeCount: active.length, autoRenewing, endingSoon };
  }, [items, now]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((s) => {
      if (tab === "active" && !ACTIVE_STATUSES.includes(s.status)) return false;
      if (tab !== "all" && tab !== "active" && s.status !== tab) return false;
      if (planFilter !== "all" && s.plan.id !== parseInt(planFilter)) return false;
      if (recurringFilter === "on" && !s.autoRenew) return false;
      if (recurringFilter === "off" && s.autoRenew) return false;
      if (q && !s.org.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, tab, planFilter, recurringFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(pageIndex, totalPages - 1);
  const pageItems = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function formatMoney(amount: number, currency: string) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  async function toggleAutoRenew(item: Subscription) {
    await fetch(`/api/subscriptions/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoRenew: !item.autoRenew }),
    });
    await load();
  }

  async function confirmTerminate() {
    if (!terminateTarget) return;
    setBusy(true);
    await fetch(`/api/subscriptions/${terminateTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "canceled" }),
    });
    setTerminateTarget(null);
    setBusy(false);
    await load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const statItems = [
    {
      title: "MRR",
      value: formatMoney(stats.mrr, "USD"),
      icon: DollarSign,
    },
    { title: "Active", value: stats.activeCount, icon: Users },
    { title: "Auto-renewing", value: stats.autoRenewing, icon: Repeat },
    { title: "Ending in 7 Days", value: stats.endingSoon, icon: AlarmClock },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Subscriptions</h1>
          <AppBreadcrumb />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <Tabs value={tab} onValueChange={(v) => { setTab(String(v)); setPageIndex(0); }} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="canceled">Cancelled</TabsTrigger>
          <TabsTrigger value="expired">Ended</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          className="h-9 w-full sm:max-w-xs"
          placeholder="Search customer..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPageIndex(0); }}
        />
        <Select value={planFilter} onValueChange={(v) => { setPlanFilter(String(v)); setPageIndex(0); }}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <span>{planFilter === "all" ? "All Plans" : plans.find((p) => p.id === parseInt(planFilter))?.name || "All Plans"}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            {plans.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={recurringFilter} onValueChange={(v) => { setRecurringFilter(String(v)); setPageIndex(0); }}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <span>
              {recurringFilter === "all" ? "All Recurring" : recurringFilter === "on" ? "Recurring On" : "Recurring Off"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Recurring</SelectItem>
            <SelectItem value="on">Recurring On</SelectItem>
            <SelectItem value="off">Recurring Off</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No subscriptions found.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">Plan</th>
                <th className="px-4 py-2.5 font-medium">Billing</th>
                <th className="px-4 py-2.5 font-medium">Credits</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Renewal</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-foreground">{item.org.name}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-foreground">{item.plan.name}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-foreground">{formatMoney(item.plan.priceMonthly, item.plan.currency)}</span>
                    <span className="text-xs capitalize text-muted-foreground"> / {item.plan.billingCycle}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-semibold text-foreground">{item.credits.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        item.status === "active"
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : item.status === "trialing"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : item.status === "pending"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : item.status === "past_due"
                                ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                                : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {item.endsAt ? (
                      <div>
                        <div>{formatDate(item.endsAt)}</div>
                        <div className="flex items-center gap-1">
                          <Repeat className="h-3 w-3" />
                          {item.autoRenew ? "Auto-renews" : "Off"}
                        </div>
                      </div>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Repeat className="h-3 w-3" />
                        {item.autoRenew ? "Auto-renews" : "Off"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canManage && (
                            <DropdownMenuItem onClick={() => toggleAutoRenew(item)}>
                              {item.autoRenew ? <Power className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                              {item.autoRenew ? "Disable Recurring" : "Enable Recurring"}
                            </DropdownMenuItem>
                          )}
                          {canManage && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => setTerminateTarget(item)}>
                                <Ban className="h-4 w-4" /> Terminate
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
          <TablePagination
            pageIndex={safePage}
            pageSize={pageSize}
            total={filtered.length}
            onPageIndexChange={setPageIndex}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      <ConfirmDialog
        open={terminateTarget !== null}
        onOpenChange={(open) => { if (!open) setTerminateTarget(null); }}
        title="Terminate subscription"
        description={
          terminateTarget
            ? `Are you sure you want to terminate the subscription for "${terminateTarget.org.name}"? They will lose access to the ${terminateTarget.plan.name} plan.`
            : undefined
        }
        confirmLabel="Terminate"
        destructive
        onConfirm={confirmTerminate}
        loading={busy}
      />
    </div>
  );
}

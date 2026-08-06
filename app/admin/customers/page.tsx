"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, MoreVertical, Pencil, Users, LogIn, Ban, EyeOff, Coins, UsersRound } from "lucide-react";
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
import { TablePagination } from "@/components/tables/table-pagination";

const TIMEZONES = [
  "(UTC-08:00) Pacific Time (US & Canada)",
  "(UTC-07:00) Mountain Time (US & Canada)",
  "(UTC-06:00) Central Time (US & Canada)",
  "(UTC-05:00) Eastern Time (US & Canada)",
  "(UTC+00:00) London, Dublin, Edinburgh",
  "(UTC+01:00) Berlin, Rome, Paris",
  "(UTC+02:00) Helsinki, Kyiv, Sofia",
  "(UTC+03:00) Moscow, Baghdad",
  "(UTC+05:30) Chennai, Kolkata, Mumbai",
  "(UTC+08:00) Beijing, Singapore, Perth",
  "(UTC+09:00) Tokyo, Seoul, Osaka",
  "(UTC+10:00) Sydney, Melbourne, Canberra",
];

interface Customer {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  status: string;
  timezone: string | null;
  language: string | null;
  company: string | null;
  orgName: string | null;
  createdAt: string;
  subscription: {
    id: number;
    planName: string;
    planPrice: number;
    status: string;
    autoRenew: boolean;
    credits: number;
    subscribers: number;
    endsAt: string | null;
  } | null;
}

export default function CustomersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const permissions = session?.user?.permissions || [];
  const canManage = permissions.includes("user.manage");
  const canImpersonate = permissions.includes("impersonate");

  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    timezone: "(UTC+00:00) London, Dublin, Edinburgh",
    language: "en",
    company: "",
  });

  async function load() {
    try {
      const res = await fetch("/api/customers");
      if (res.ok) {
        const d = await res.json();
        setItems(d.customers || []);
      }
    } catch {
      setError("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      if (tab === "active" && c.status !== "active") return false;
      if (tab === "inactive" && c.status === "active") return false;
      if (q && !`${c.firstName || ""} ${c.lastName || ""} ${c.email} ${c.orgName || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, tab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(pageIndex, totalPages - 1);
  const pageItems = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const counts = useMemo(
    () => ({
      total: items.length,
      active: items.filter((c) => c.status === "active").length,
      inactive: items.length - items.filter((c) => c.status === "active").length,
      subscribed: items.filter((c) => c.subscription && ["active", "trialing", "past_due"].includes(c.subscription.status)).length,
    }),
    [items]
  );

  function openCreate() {
    setEditing(null);
    setForm({
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      timezone: "(UTC+00:00) London, Dublin, Edinburgh",
      language: "en",
      company: "",
    });
    setError("");
    setShowForm(true);
  }

  function openEdit(item: Customer) {
    setEditing(item);
    setForm({
      email: item.email,
      firstName: item.firstName || "",
      lastName: item.lastName || "",
      password: "",
      timezone: item.timezone || "(UTC+00:00) London, Dublin, Edinburgh",
      language: item.language || "en",
      company: item.company || "",
    });
    setError("");
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(editing ? `/api/customers/${editing.id}` : "/api/customers", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          ...(form.password ? { password: form.password } : {}),
          timezone: form.timezone,
          language: form.language,
          company: form.company,
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

  async function loginAs(item: Customer) {
    setError("");
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: item.id }),
    });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || "Failed to sign in as customer");
      return;
    }
    router.push(d.redirect || "/app");
    router.refresh();
  }

  async function toggleStatus(item: Customer) {
    const next = item.status === "active" ? "inactive" : "active";
    await fetch("/api/customers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, status: next }),
    });
    await load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/customers/${deleteTarget.id}`, { method: "DELETE" });
    const d = await res.json();
    if (!res.ok) setError(d.error || "Failed to disable customer");
    setDeleteTarget(null);
    await load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const statItems = [
    { title: "Total Customers", value: counts.total, icon: Users },
    { title: "Active", value: counts.active, icon: UsersRound },
    { title: "Subscribed", value: counts.subscribed, icon: Coins },
    { title: "Inactive", value: counts.inactive, icon: Ban },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Customers</h1>
          <AppBreadcrumb />
        </div>
        {canManage && (
          <Button onClick={openCreate} className="h-8 gap-1.5 px-2.5">
            <Plus className="h-4 w-4" /> New Customer
          </Button>
        )}
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

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          className="h-9 w-full sm:max-w-xs"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPageIndex(0);
          }}
        />
        <Tabs value={tab} onValueChange={(v) => { setTab(String(v)); setPageIndex(0); }}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No customers found.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">Plan</th>
                <th className="px-4 py-2.5 font-medium">Sending Credits</th>
                <th className="px-4 py-2.5 font-medium">Subscribers</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {`${item.firstName || ""} ${item.lastName || ""}`.trim().split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "C"}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-foreground">
                          {`${item.firstName || ""} ${item.lastName || ""}`.trim() || item.email}
                        </div>
                        <div className="text-xs text-muted-foreground">{item.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {item.subscription ? (
                      <div>
                        <span className="font-medium text-foreground">{item.subscription.planName}</span>
                        {item.subscription.status !== "active" && (
                          <span className="ml-2 text-xs capitalize text-muted-foreground">({item.subscription.status.replace("_", " ")})</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No plan</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-semibold text-foreground">{item.subscription?.credits.toLocaleString() ?? "—"}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-semibold text-foreground">{item.subscription?.subscribers.toLocaleString() ?? "—"}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        item.status === "active"
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : item.status === "suspended"
                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canImpersonate && (
                            <DropdownMenuItem onClick={() => loginAs(item)}>
                              <LogIn className="h-4 w-4" /> Login As
                            </DropdownMenuItem>
                          )}
                          {canManage && (
                            <>
                              <DropdownMenuItem onClick={() => openEdit(item)}>
                                <Pencil className="h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push("/admin/subscriptions")}>
                                <Coins className="h-4 w-4" /> Subscription
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleStatus(item)}>
                                {item.status === "active" ? <Ban className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                {item.status === "active" ? "Disable" : "Enable"}
                              </DropdownMenuItem>
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
          <TablePagination
            pageIndex={safePage}
            pageSize={pageSize}
            total={filtered.length}
            onPageIndexChange={setPageIndex}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle>
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
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-foreground">Company</Label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Timezone</Label>
                <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: String(v) })}>
                  <SelectTrigger className="w-full text-xs">
                    <span className="truncate">{form.timezone}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Language</Label>
                <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: String(v) })}>
                  <SelectTrigger className="w-full">
                    <span className="uppercase">{form.language}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">EN</SelectItem>
                    <SelectItem value="es">ES</SelectItem>
                    <SelectItem value="fr">FR</SelectItem>
                    <SelectItem value="de">DE</SelectItem>
                    <SelectItem value="ar">AR</SelectItem>
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

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Disable customer"
        description={
          deleteTarget
            ? `Are you sure you want to disable the customer "${deleteTarget.email}"? They will no longer be able to sign in.`
            : undefined
        }
        confirmLabel="Disable"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}

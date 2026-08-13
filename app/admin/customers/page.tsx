"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreVertical,
  Pencil,
  Users,
  LogIn,
  Ban,
  EyeOff,
  Coins,
  UsersRound,
  Loader2,
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  type ColumnDef,
  type FilterFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { DataTable } from "@/components/tables/data-table";
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header";
import { DataTablePagination } from "@/components/tables/data-table-pagination";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";
import { DataTableFacetedFilter } from "@/components/tables/data-table-faceted-filter";

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

const COLUMN_IDS = ["name", "plan", "credits", "subscribers", "status", "actions"] as const;

const COLUMN_LABELS: Record<string, string> = {
  name: "Customer",
  plan: "Plan",
  credits: "Sending Credits",
  subscribers: "Subscribers",
  status: "Status",
  actions: "Actions",
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
];

const STORAGE_KEY = "customers-column-visibility";

function loadInitialVisibility(): VisibilityState {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      const visibility: VisibilityState = {};
      COLUMN_IDS.forEach((id) => {
        visibility[id] = parsed.includes(id);
      });
      return visibility;
    }
  } catch {}
  return {};
}

const customerGlobalFilter: FilterFn<Customer> = (row, _columnId, filterValue) => {
  const c = row.original;
  const q = String(filterValue ?? "").toLowerCase();
  if (!q) return true;
  return [c.firstName, c.lastName, c.email, c.orgName, c.company]
    .filter(Boolean)
    .some((f) => String(f).toLowerCase().includes(q));
};

const statusFilterFn: FilterFn<Customer> = (row, columnId, filterValue) => {
  const value = row.getValue(columnId);
  const selected = filterValue as string[] | undefined;
  return !selected || selected.length === 0 || selected.includes(String(value));
};

function CustomerRowActions({
  item,
  canManage,
  canImpersonate,
  onEdit,
  onLoginAs,
  onToggleStatus,
  onDelete,
}: {
  item: Customer;
  canManage: boolean;
  canImpersonate: boolean;
  onEdit: (item: Customer) => void;
  onLoginAs: (item: Customer) => void;
  onToggleStatus: (item: Customer) => void;
  onDelete: (item: Customer) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <MoreVertical className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canImpersonate && (
          <DropdownMenuItem onClick={() => onLoginAs(item)}>
            <LogIn className="h-4 w-4" /> Login As
          </DropdownMenuItem>
        )}
        {canManage && (
          <>
            <DropdownMenuItem onClick={() => onEdit(item)}>
              <Pencil className="h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleStatus(item)}>
              {item.status === "active" ? <Ban className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {item.status === "active" ? "Disable" : "Enable"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(item)}>
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const columns: ColumnDef<Customer>[] = [
  {
    id: "name",
    accessorFn: (row) => `${row.firstName || ""} ${row.lastName || ""}`.trim() || row.email,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
    cell: ({ row }) => {
      const item = row.original;
      return (
        <div className="flex items-center gap-3">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {`${item.firstName || ""} ${item.lastName || ""}`.trim().split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "C"}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {`${item.firstName || ""} ${item.lastName || ""}`.trim() || item.email}
            </p>
            <p className="text-xs text-muted-foreground truncate">{item.email}</p>
          </div>
        </div>
      );
    },
  },
  {
    id: "plan",
    accessorFn: (row) => row.subscription?.planName ?? "No plan",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Plan" />,
    cell: ({ row }) => {
      const sub = row.original.subscription;
      if (!sub) return <span className="text-xs text-muted-foreground">No plan</span>;
      return (
        <div>
          <span className="text-sm font-medium text-foreground">{sub.planName}</span>
          {sub.status !== "active" && (
            <span className="ml-2 text-xs capitalize text-muted-foreground">({sub.status.replace("_", " ")})</span>
          )}
        </div>
      );
    },
  },
  {
    id: "credits",
    accessorFn: (row) => row.subscription?.credits ?? null,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sending Credits" />,
    cell: ({ row }) => (
      <span className="text-sm font-semibold text-foreground">
        {row.original.subscription?.credits.toLocaleString() ?? "—"}
      </span>
    ),
    enableSorting: false,
  },
  {
    id: "subscribers",
    accessorFn: (row) => row.subscription?.subscribers ?? null,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Subscribers" />,
    cell: ({ row }) => (
      <span className="text-sm font-semibold text-foreground">
        {row.original.subscription?.subscribers.toLocaleString() ?? "—"}
      </span>
    ),
    enableSorting: false,
  },
  {
    id: "status",
    accessorKey: "status",
    filterFn: statusFilterFn,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant="outline"
          className={`rounded-full border-border px-1.5 capitalize ${
            status === "active"
              ? "text-green-600 dark:text-green-400"
              : status === "suspended"
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
          }`}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: () => null,
    enableSorting: false,
    enableHiding: false,
  },
];

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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(loadInitialVisibility);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    try {
      const visible = COLUMN_IDS.filter((id) => columnVisibility[id] !== false);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visible));
    } catch {}
  }, [columnVisibility]);

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
    const q = debouncedSearch.trim().toLowerCase();
    return items.filter((c) => {
      if (tab === "active" && c.status !== "active") return false;
      if (tab === "inactive" && c.status === "active") return false;
      if (q && !`${c.firstName || ""} ${c.lastName || ""} ${c.email} ${c.orgName || ""} ${c.company || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, tab, debouncedSearch]);

  const tableData = useMemo(() => filtered, [filtered]);

  const actionsColumn = useMemo(() => {
    return columns.map((col) => {
      if (col.id === "actions") {
        return {
          ...col,
          cell: ({ row }: { row: { original: Customer } }) => (
            <div className="flex justify-end">
              <CustomerRowActions
                item={row.original}
                canManage={canManage}
                canImpersonate={canImpersonate}
                onEdit={openEdit}
                onLoginAs={loginAs}
                onToggleStatus={toggleStatus}
                onDelete={setDeleteTarget}
              />
            </div>
          ),
        };
      }
      return col;
    });
  }, [canManage, canImpersonate]);

  const table = useReactTable({
    data: tableData,
    columns: actionsColumn,
    state: { sorting, pagination, columnVisibility, rowSelection, globalFilter: debouncedSearch },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => String(row.id),
    globalFilterFn: customerGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
  });

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

  const statItems = [
    { title: "Total Customers", value: counts.total, icon: Users },
    { title: "Active", value: counts.active, icon: UsersRound },
    { title: "Subscribed", value: counts.subscribed, icon: Coins },
    { title: "Inactive", value: counts.inactive, icon: Ban },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statItems.map((item) => (
          <Card key={item.title} className="shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
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

      {/* Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {(["all", "active", "inactive"] as const).map((t) => (
          <Button
            key={t}
            variant={tab === t ? "default" : "outline"}
            size="sm"
            onClick={() => { setTab(t); setPagination((p) => ({ ...p, pageIndex: 0 })); }}
          >
            {t === "all" ? "All" : t === "active" ? "Active" : "Inactive"}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading customers...
          </div>
        ) : error ? (
          <div className="p-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-4">
            <DataTableToolbar
              table={table}
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search customers..."
              labels={COLUMN_LABELS}
              filters={
                <DataTableFacetedFilter
                  column={table.getColumn("status")}
                  title="Status"
                  options={STATUS_OPTIONS}
                />
              }
            />
            <DataTable
              table={table}
              stickyHeader={false}
              emptyNode={<span className="text-muted-foreground">No customers found.</span>}
            />
            <DataTablePagination table={table} />
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
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

      {/* Delete Confirmation */}
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

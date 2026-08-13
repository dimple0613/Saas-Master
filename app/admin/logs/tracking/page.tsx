"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Mail, MailOpen, MousePointerClick, AlertTriangle, Clock, Loader2 } from "lucide-react";
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
  type SortingState,
} from "@tanstack/react-table";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/tables/data-table";
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header";
import { DataTablePagination } from "@/components/tables/data-table-pagination";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";
import { DataTableFacetedFilter } from "@/components/tables/data-table-faceted-filter";

interface LogEntry {
  id: number;
  email: string;
  subject: string | null;
  status: string;
  openedAt: string | null;
  clickedAt: string | null;
  createdAt: string;
}

const COLUMN_IDS = ["email", "subject", "status", "openedAt", "clickedAt", "createdAt"] as const;

const COLUMN_LABELS: Record<string, string> = {
  email: "Email",
  subject: "Subject",
  status: "Status",
  openedAt: "Opened",
  clickedAt: "Clicked",
  createdAt: "Sent",
};

const STATUS_OPTIONS = [
  { value: "sent", label: "Sent", icon: Mail },
  { value: "opened", label: "Opened", icon: MailOpen },
  { value: "clicked", label: "Clicked", icon: MousePointerClick },
  { value: "bounced", label: "Bounced", icon: AlertTriangle },
];

const logGlobalFilter: FilterFn<LogEntry> = (row, _columnId, filterValue) => {
  const entry = row.original;
  const q = String(filterValue ?? "").toLowerCase();
  if (!q) return true;
  return [entry.email, entry.subject ?? "", entry.status].some((f) =>
    f.toLowerCase().includes(q)
  );
};

const statusFilterFn: FilterFn<LogEntry> = (row, columnId, filterValue) => {
  const value = row.getValue(columnId);
  const selected = filterValue as string[] | undefined;
  return !selected || selected.length === 0 || selected.includes(String(value));
};

const statusVariant = (status: string) => {
  if (status === "sent") return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
  if (status === "opened") return "bg-green-500/10 text-green-600 dark:text-green-400";
  if (status === "clicked") return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
  return "bg-red-500/10 text-red-600 dark:text-red-400";
};

const columns: ColumnDef<LogEntry>[] = [
  {
    id: "email",
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => (
      <span className="text-sm font-medium text-foreground">{row.original.email}</span>
    ),
  },
  {
    id: "subject",
    accessorKey: "subject",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Subject" />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.subject || "—"}</span>
    ),
  },
  {
    id: "status",
    accessorKey: "status",
    filterFn: statusFilterFn,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={`capitalize rounded-full px-2 py-0.5 text-xs font-medium ${statusVariant(row.original.status)}`}
      >
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: "openedAt",
    accessorKey: "openedAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Opened" />,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.openedAt ? new Date(row.original.openedAt).toLocaleString() : "—"}
      </span>
    ),
  },
  {
    id: "clickedAt",
    accessorKey: "clickedAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Clicked" />,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.clickedAt ? new Date(row.original.clickedAt).toLocaleString() : "—"}
      </span>
    ),
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sent" />,
    cell: ({ row }) => (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {new Date(row.original.createdAt).toLocaleString()}
      </span>
    ),
  },
];

export default function TrackingLogsPage() {
  const { data: session } = useSession();
  const canView = (session?.user?.permissions || []).includes("log.view");

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [counts, setCounts] = useState({ sent: 0, opened: 0, clicked: 0, bounced: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  async function load() {
    setPagination({ pageIndex: 0, pageSize: pagination.pageSize });
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/logs/tracking?status=${tab}&search=${encodeURIComponent(debouncedSearch)}`);
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs || []);
        setCounts(d.counts || { sent: 0, opened: 0, clicked: 0, bounced: 0 });
      }
    } catch {
      setError("Failed to load tracking logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, debouncedSearch]);

  const table = useReactTable({
    data: logs,
    columns,
    state: { sorting, pagination, globalFilter: debouncedSearch },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    globalFilterFn: logGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const statItems = [
    { title: "Sent", value: counts.sent, icon: Mail },
    { title: "Opened", value: counts.opened, icon: MailOpen },
    { title: "Clicked", value: counts.clicked, icon: MousePointerClick },
    { title: "Bounced", value: counts.bounced, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Email Tracking</h1>
          <AppBreadcrumb />
        </div>
      </div>

      {!canView && (
        <Alert variant="destructive">
          <AlertDescription>You do not have permission to view logs. Contact a super admin.</AlertDescription>
        </Alert>
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

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="opened">Opened</TabsTrigger>
          <TabsTrigger value="clicked">Clicked</TabsTrigger>
          <TabsTrigger value="bounced">Bounced</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-2xl border border-border bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading tracking logs...
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
              searchPlaceholder="Search email or subject..."
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
              emptyNode={<span className="text-muted-foreground">No tracking logs found.</span>}
            />
            <DataTablePagination table={table} />
          </div>
        )}
      </div>
    </div>
  );
}

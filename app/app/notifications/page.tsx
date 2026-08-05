"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useOrg } from "@/lib/org-context";
import { formatAction } from "@/components/topnav";
import { Bell } from "lucide-react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { CATEGORY_STYLES, categoryLabel, CATEGORY_LABELS } from "@/lib/category-utils";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { DataTable } from "@/components/tables/data-table";
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header";
import { DataTablePagination } from "@/components/tables/data-table-pagination";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";

interface ActivityLog {
  id: number;
  action: string;
  category: string;
  details: Record<string, unknown> | null;
  created_at: string;
  user: { first_name: string | null; last_name: string | null; email: string };
  org: { name: string } | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

const columns: ColumnDef<ActivityLog>[] = [
  {
    id: "user",
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="User" />
    ),
    cell: ({ row }) => {
      const log = row.original;
      return (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
            {(log.user.first_name || "").charAt(0).toUpperCase() ||
              log.user.email.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {log.user.first_name || log.user.last_name
                ? `${log.user.first_name || ""} ${log.user.last_name || ""}`.trim()
                : log.user.email}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {log.user.email}
            </p>
          </div>
        </div>
      );
    },
  },
  {
    id: "activity",
    accessorKey: "action",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Activity" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-foreground">
        {formatAction(row.original.action, row.original.details)}
      </span>
    ),
  },
  {
    id: "category",
    accessorKey: "category",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category" />
    ),
    cell: ({ row }) => (
      <span
        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
          CATEGORY_STYLES[row.original.category] || "bg-muted text-muted-foreground"
        }`}
      >
        {categoryLabel(row.original.category)}
      </span>
    ),
  },
  {
    id: "organization",
    accessorFn: (log) => log.org?.name ?? "—",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Organization" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.org?.name || "—"}
      </span>
    ),
  },
  {
    id: "date",
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date & Time" />
    ),
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {formatDate(row.original.created_at)}
      </span>
    ),
  },
];

export default function NotificationsPage() {
  const { orgId } = useOrg();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let ignore = false;
    (async () => {
      const offset = pagination.pageIndex * pagination.pageSize;
      const sortColumn = sorting[0]?.id ?? "date";
      const sortOrder = sorting[0]?.desc ? "desc" : "asc";
      const params = new URLSearchParams({
        limit: String(pagination.pageSize),
        offset: String(offset),
        sortBy: sortColumn,
        sortOrder,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (orgId && session?.user?.role !== "superadmin")
        params.set("org_id", String(orgId));
      if (category !== "all") params.set("category", category);
      try {
        const res = await fetch(`/api/activity?${params}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setLogs(data.logs || []);
            setTotal(data.total || 0);
          }
        }
      } catch {}
      if (!ignore) setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, [
    orgId,
    category,
    pagination.pageIndex,
    pagination.pageSize,
    sorting,
    mounted,
    session?.user?.role,
    debouncedSearch,
  ]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const scrollY = window.scrollY;
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    requestAnimationFrame(() => window.scrollTo(0, scrollY));
  }, [category, orgId, pagination.pageSize]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(total / pagination.pageSize) - 1);
    if (pagination.pageIndex > maxPage) {
      setPagination((p) => ({ ...p, pageIndex: maxPage }));
    }
  }, [total, pagination.pageIndex, pagination.pageSize]);

  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize));

  const table = useReactTable({
    data: logs,
    columns,
    state: { sorting, pagination, rowSelection },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => String(row.id),
    manualPagination: true,
    manualSorting: true,
    pageCount,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!mounted) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Notifications
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          Notifications
        </h1>
        <AppBreadcrumb />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="space-y-4">
          <DataTableToolbar
            table={table}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search notifications..."
            filters={
              <Select
                value={category}
                onValueChange={(value) => setCategory(String(value))}
                className="w-44"
              >
                <SelectTrigger className="h-8">
                  <span>
                    {category === "all"
                      ? "All Categories"
                      : categoryLabel(category)}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />

          <DataTable
            table={table}
            loading={loading}
            stickyHeader
            emptyNode={
              <div>
                <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No notifications found
                </p>
              </div>
            }
          />

          <DataTablePagination table={table} loading={loading} />
        </div>
      </div>
    </div>
  );
}

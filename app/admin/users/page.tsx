"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MoreVertical } from "lucide-react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { DataTable } from "@/components/tables/data-table";
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header";
import { DataTablePagination } from "@/components/tables/data-table-pagination";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  org_name: string;
  role: string;
  status: string;
  created_at: string;
}

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "joined", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const offset = pagination.pageIndex * pagination.pageSize;
        const sortColumn = sorting[0]?.id ?? "joined";
        const sortOrder = sorting[0]?.desc ? "desc" : "asc";
        const params = new URLSearchParams({
          limit: String(pagination.pageSize),
          offset: String(offset),
          sortBy: sortColumn,
          sortOrder,
        });
        if (debouncedSearch) params.set("search", debouncedSearch);
        const res = await fetch(`/api/users?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setUsers(data.users || []);
            setTotal(data.total || 0);
          }
        }
      } catch {}
      if (!ignore) setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, [pagination.pageIndex, pagination.pageSize, sorting, debouncedSearch]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(total / pagination.pageSize) - 1);
    if (pagination.pageIndex > maxPage) {
      setPagination((p) => ({ ...p, pageIndex: maxPage }));
    }
  }, [total, pagination.pageIndex, pagination.pageSize]);

  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize));

  async function changeRole(id: number, newRole: string) {
    await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role: newRole } : u))
    );
  }

  async function changeStatus(id: number, newStatus: string) {
    await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: newStatus } : u))
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const columns: ColumnDef<User>[] = [
    {
      id: "name",
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
              {(user.first_name || user.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-foreground">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: "organization",
      accessorKey: "org_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Organization" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.org_name || "—"}
        </span>
      ),
    },
    {
      id: "role",
      accessorKey: "role",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => {
        const user = row.original;
        if (session?.user?.id === String(user.id)) {
          return (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {user.role}
            </span>
          );
        }
        return (
          <Select
            value={user.role}
            onValueChange={(val) => changeRole(user.id, String(val))}
          >
            <SelectTrigger className="h-8 w-32 text-xs">
              <span>{user.role}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="superadmin">Superadmin</SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
              status === "active"
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : status === "suspended"
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {status}
          </span>
        );
      },
    },
    {
      id: "joined",
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Joined" />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right" />,
      cell: ({ row }) => {
        const user = row.original;
        if (session?.user?.id === String(user.id)) return null;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-sm" />}
              >
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user.status === "active" ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => changeStatus(user.id, "suspended")}
                  >
                    Suspend
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => changeStatus(user.id, "active")}
                  >
                    Reactivate
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteTarget(user)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: users,
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          Users
        </h1>
        <AppBreadcrumb />
      </div>

      <div className="space-y-4">
        <DataTableToolbar
          table={table}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search users..."
        />

        <DataTable
          table={table}
          loading={loading}
          stickyHeader
          emptyNode={<span className="text-muted-foreground">No users found.</span>}
        />

        <DataTablePagination table={table} loading={loading} />
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete user"
        description={
          deleteTarget
            ? `Are you sure you want to delete ${deleteTarget.first_name} ${deleteTarget.last_name}? This action cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

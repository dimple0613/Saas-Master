"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { Plus, AlertCircle, MoreVertical, Pencil, Trash2 } from "lucide-react";
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

interface DataRow {
  id: number;
  title: string;
  content: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export function OrgDataSection() {
  const { orgId } = useOrg();
  const [mounted, setMounted] = useState(false);
  const [dataRows, setDataRows] = useState<DataRow[]>([]);
  const [total, setTotal] = useState(0);
  const [myRole, setMyRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
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

  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createError, setCreateError] = useState("");

  const [editRow, setEditRow] = useState<DataRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<DataRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!orgId) {
      setDataRows([]);
      setTotal(0);
      setMyRole("");
      setLoading(false);
      return;
    }
    let ignore = false;
    (async () => {
      try {
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
        const res = await fetch(`/api/orgs/${orgId}/data?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setDataRows(data.data || []);
            setTotal(data.total || 0);
            setMyRole(data.myRole || "");
          }
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [
    orgId,
    pagination.pageIndex,
    pagination.pageSize,
    sorting,
    mounted,
    refreshKey,
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
  }, [orgId, pagination.pageSize]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(total / pagination.pageSize) - 1);
    if (pagination.pageIndex > maxPage) {
      setPagination((p) => ({ ...p, pageIndex: maxPage }));
    }
  }, [total, pagination.pageIndex, pagination.pageSize]);

  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize));
  const canWrite = ["owner", "admin"].includes(myRole);
  const canDelete = ["owner", "admin"].includes(myRole);

  function openCreate() {
    setShowCreate(true);
    setCreateTitle("");
    setCreateContent("");
    setCreateError("");
  }

  async function createRow(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    if (!createTitle.trim()) {
      setCreateError("Title is required");
      return;
    }
    const res = await fetch(`/api/orgs/${orgId}/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: createTitle, content: createContent }),
    });
    const data = await res.json();
    if (data.error) {
      setCreateError(data.error);
      return;
    }
    setShowCreate(false);
    setCreateTitle("");
    setCreateContent("");
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    setRefreshKey((k) => k + 1);
  }

  function openEdit(row: DataRow) {
    setEditRow(row);
    setEditTitle(row.title);
    setEditContent(row.content || "");
    setEditError("");
  }

  async function updateRow(e: React.FormEvent) {
    e.preventDefault();
    setEditError("");
    if (!editTitle.trim()) {
      setEditError("Title is required");
      return;
    }
    if (!editRow) return;
    const res = await fetch(`/api/orgs/${orgId}/data/${editRow.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, content: editContent }),
    });
    const data = await res.json();
    if (data.error) {
      setEditError(data.error);
      return;
    }
    setEditRow(null);
    setEditTitle("");
    setEditContent("");
    setRefreshKey((k) => k + 1);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/orgs/${orgId}/data/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } finally {
      setDeleting(false);
    }
  }

  const columns: ColumnDef<DataRow>[] = [
    {
      id: "title",
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Title" />
      ),
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.title}</span>
      ),
    },
    {
      id: "content",
      accessorKey: "content",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Content" />
      ),
      cell: ({ row }) => (
        <span className="max-w-xs truncate text-muted-foreground">
          {row.original.content || ""}
        </span>
      ),
    },
    {
      id: "createdBy",
      accessorFn: (row) =>
        [row.first_name, row.last_name].filter(Boolean).join(" ") || "—",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created By" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {[row.original.first_name, row.original.last_name]
            .filter(Boolean)
            .join(" ") || "—"}
        </span>
      ),
    },
    {
      id: "date",
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      ),
    },
    ...((canWrite || canDelete)
      ? [
          {
            id: "actions",
            header: () => <div className="text-right" />,
            cell: ({ row }: { row: { original: DataRow } }) => (
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon-sm" />}
                  >
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    {canWrite && (
                      <DropdownMenuItem onClick={() => openEdit(row.original)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteTarget(row.original)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ),
          } as ColumnDef<DataRow>,
        ]
      : []),
  ];

  const table = useReactTable({
    data: dataRows,
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

  if (!mounted || !orgId) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Organization Data
            </h2>
            <p className="text-sm text-muted-foreground">
              Profile data for the selected organization
            </p>
          </div>
        </div>
        <div className="p-6 text-center text-sm text-muted-foreground">
          Select an organization from the sidebar to view data.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Organization Data
          </h2>
          <p className="text-sm text-muted-foreground">
            Profile data for the selected organization
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Record
          </Button>
        )}
      </div>

      <DataTableToolbar
        table={table}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search records..."
      />

      <DataTable
        table={table}
        loading={loading}
        stickyHeader
        emptyNode={<span className="text-muted-foreground">No data yet.</span>}
      />

      <DataTablePagination table={table} loading={loading} />

      {/* Create Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Record</DialogTitle>
          </DialogHeader>
          {createError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {createError}
            </div>
          )}
          <form onSubmit={createRow} className="space-y-4">
            <div>
              <Label htmlFor="create-title">Title</Label>
              <Input
                id="create-title"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Record title"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="create-content">Content</Label>
              <Textarea
                id="create-content"
                value={createContent}
                onChange={(e) => setCreateContent(e.target.value)}
                rows={3}
                placeholder="Record content (optional)"
                className="mt-1.5"
              />
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editRow !== null} onOpenChange={(open) => { if (!open) setEditRow(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
            <DialogDescription>
              Update the selected record.
            </DialogDescription>
          </DialogHeader>
          {editError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {editError}
            </div>
          )}
          <form onSubmit={updateRow} className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="mt-1.5"
              />
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete record"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.title}"? This action cannot be undone.`
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

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Users, Shield, Mail, UserX, Clock, MoreVertical, CheckCircle2, Ban, Loader2, Trash2 } from "lucide-react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/tables/data-table";
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header";
import { DataTablePagination } from "@/components/tables/data-table-pagination";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";
import { DataTableFacetedFilter } from "@/components/tables/data-table-faceted-filter";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

interface Member {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: "active" | "inactive" | "pending";
  joined: string;
}

const STATIC_MEMBERS: Member[] = [
  { id: 1, name: "Olivia Martin", email: "olivia.martin@email.com", phone: "+1 (555) 123-4567", role: "Admin", status: "active", joined: "2024-01-15" },
  { id: 2, name: "Jackson Lee", email: "jackson.lee@email.com", phone: "+1 (555) 234-5678", role: "Member", status: "active", joined: "2024-02-20" },
  { id: 3, name: "Isabella Nguyen", email: "isabella.nguyen@email.com", phone: "+1 (555) 345-6789", role: "Member", status: "active", joined: "2024-03-10" },
  { id: 4, name: "William Kim", email: "william.kim@email.com", phone: "+1 (555) 456-7890", role: "Member", status: "inactive", joined: "2024-04-05" },
  { id: 5, name: "Sofia Davis", email: "sofia.davis@email.com", phone: "+1 (555) 567-8901", role: "Admin", status: "active", joined: "2024-05-12" },
  { id: 6, name: "Lucas Brown", email: "lucas.brown@email.com", phone: "+1 (555) 678-9012", role: "Member", status: "pending", joined: "2024-06-18" },
  { id: 7, name: "Emma Wilson", email: "emma.wilson@email.com", phone: "+1 (555) 789-0123", role: "Member", status: "active", joined: "2024-07-22" },
  { id: 8, name: "Liam Johnson", email: "liam.johnson@email.com", phone: "+1 (555) 890-1234", role: "Member", status: "active", joined: "2024-08-30" },
  { id: 9, name: "Ava Taylor", email: "ava.taylor@email.com", phone: "+1 (555) 901-2345", role: "Member", status: "inactive", joined: "2024-09-14" },
  { id: 10, name: "Noah Anderson", email: "noah.anderson@email.com", phone: "+1 (555) 012-3456", role: "Member", status: "active", joined: "2024-10-08" },
  { id: 11, name: "Mia Thomas", email: "mia.thomas@email.com", phone: "+1 (555) 111-2222", role: "Member", status: "pending", joined: "2024-11-03" },
  { id: 12, name: "Ethan Garcia", email: "ethan.garcia@email.com", phone: "+1 (555) 222-3333", role: "Member", status: "active", joined: "2024-12-19" },
];

const COLUMN_IDS = ["name", "role", "status", "joined", "actions"] as const;

const COLUMN_LABELS: Record<string, string> = {
  name: "Member",
  role: "Role",
  status: "Status",
  joined: "Joined",
  actions: "Actions",
};

const AVATAR_COLORS = [
  "from-violet-500 to-fuchsia-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-amber-500",
  "from-rose-500 to-pink-500",
  "from-indigo-500 to-purple-500",
];

const STORAGE_KEY = "members-column-visibility";

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

const memberGlobalFilter: FilterFn<Member> = (row, _columnId, filterValue) => {
  const member = row.original;
  const q = String(filterValue ?? "").toLowerCase();
  if (!q) return true;
  return [member.name, member.email, member.role, member.status].some((f) =>
    f.toLowerCase().includes(q)
  );
};

const statusFilterFn: FilterFn<Member> = (row, columnId, filterValue) => {
  const value = row.getValue(columnId);
  const selected = filterValue as string[] | undefined;
  return !selected || selected.length === 0 || selected.includes(String(value));
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active", icon: CheckCircle2 },
  { value: "pending", label: "Pending", icon: Clock },
  { value: "inactive", label: "Inactive", icon: Ban },
];

const columns: ColumnDef<Member>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Member" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar size="sm">
          <AvatarFallback
            className={`bg-gradient-to-br ${AVATAR_COLORS[(row.original.id - 1) % AVATAR_COLORS.length]} text-white text-xs`}
          >
            {row.original.name.split(" ").map((n) => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{row.original.name}</p>
          <p className="text-xs text-muted-foreground truncate">{row.original.email}</p>
        </div>
      </div>
    ),
  },
  {
    id: "role",
    accessorKey: "role",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
    cell: ({ row }) => (
      <Badge variant={row.original.role === "Admin" ? "default" : "secondary"}>
        {row.original.role}
      </Badge>
    ),
  },
  {
    id: "status",
    accessorKey: "status",
    filterFn: statusFilterFn,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const status = row.original.status;
      const StatusIcon =
        status === "active"
          ? CheckCircle2
          : status === "pending"
            ? Loader2
            : Ban;
      const iconClassName =
        status === "active"
          ? "text-green-500 dark:text-green-400"
          : status === "pending"
            ? "text-yellow-500 dark:text-yellow-400"
            : "text-muted-foreground";
      return (
        <Badge
          variant="outline"
          className="rounded-full border-border px-1.5 text-muted-foreground"
        >
          <StatusIcon
            className={`h-3 w-3 ${iconClassName} ${status === "pending" ? "animate-spin" : ""}`}
          />
          {status}
        </Badge>
      );
    },
  },
  {
    id: "joined",
    accessorKey: "joined",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Joined" />,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {new Date(row.original.joined).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <MemberRowActions member={row.original} />
      </div>
    ),
  },
];

function MemberRowActions({ member }: { member: Member }) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleRemove() {
    setConfirmOpen(false);
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 p-1">
          <DropdownMenuItem className="py-0.5" onClick={() => setOpen(false)}>
            <Mail className="h-3.5 w-3.5" />
            Send Email
          </DropdownMenuItem>
          <DropdownMenuItem className="py-0.5" onClick={() => setOpen(false)}>
            <Shield className="h-3.5 w-3.5" />
            Change Role
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            className="py-0.5"
            onClick={() => {
              setOpen(false);
              setConfirmOpen(true);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove Member?"
        description="Are you sure you want to remove this member? This action cannot be undone."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleRemove}
      />
    </>
  );
}

export default function MembersPage() {
  const router = useRouter();
  const [members] = useState<Member[]>(STATIC_MEMBERS);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(loadInitialVisibility);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

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

  const table = useReactTable({
    data: members,
    columns,
    state: { sorting, pagination, columnVisibility, rowSelection, globalFilter: debouncedSearch },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => String(row.id),
    globalFilterFn: memberGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const totalActive = members.filter((m) => m.status === "active").length;
  const totalPending = members.filter((m) => m.status === "pending").length;
  const totalInactive = members.filter((m) => m.status === "inactive").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Members</h1>
          <AppBreadcrumb />
        </div>
        <Button onClick={() => router.push("/app/members/add")} className="h-8 gap-1.5 px-2.5">
          <UserPlus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActive}</div>
          </CardContent>
        </Card>
        <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPending}</div>
          </CardContent>
        </Card>
        <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <UserX className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInactive}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="space-y-4">
          <DataTableToolbar
            table={table}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search members..."
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
            emptyNode={<span className="text-muted-foreground">No members found.</span>}
          />
          <DataTablePagination table={table} />
          </div>
      </div>
    </div>
  );
}

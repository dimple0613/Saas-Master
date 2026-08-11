"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { UserPlus, Users, Shield, Mail, Clock, MoreVertical, CheckCircle2, Loader2, Trash2, Copy, Send } from "lucide-react";
import { toast } from "sonner";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { useOrg } from "@/lib/org-context";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header";
import { DataTablePagination } from "@/components/tables/data-table-pagination";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";
import { DataTableFacetedFilter } from "@/components/tables/data-table-faceted-filter";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { InviteMemberDialog } from "@/components/members/invite-member-dialog";

type MemberStatus = "active" | "invitation_pending";

interface Member {
  id: string;
  kind: "member" | "invitation";
  avatarId: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: MemberStatus;
  joined: string;
  orgId: number;
  memberId: number | null;
  invitationId: number | null;
}

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

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

function statusLabel(status: MemberStatus): string {
  return status === "active" ? "Active" : "Invitation Pending";
}

const memberGlobalFilter: FilterFn<Member> = (row, _columnId, filterValue) => {
  const member = row.original;
  const q = String(filterValue ?? "").toLowerCase();
  if (!q) return true;
  return [member.name, member.email, ROLE_LABELS[member.role] || member.role, statusLabel(member.status)].some((f) =>
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
  { value: "invitation_pending", label: "Invitation Pending", icon: Clock },
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
            className={`bg-gradient-to-br ${AVATAR_COLORS[(row.original.avatarId - 1) % AVATAR_COLORS.length]} text-white text-xs`}
          >
            {row.original.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
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
      <Badge variant={ROLE_LABELS[row.original.role] === "Admin" ? "default" : "secondary"}>
        {ROLE_LABELS[row.original.role] || row.original.role}
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
      const StatusIcon = status === "active" ? CheckCircle2 : Clock;
      const iconClassName =
        status === "active"
          ? "text-green-500 dark:text-green-400"
          : "text-yellow-500 dark:text-yellow-400";
      return (
        <Badge
          variant="outline"
          className="rounded-full border-border px-1.5 text-muted-foreground"
        >
          <StatusIcon className={`h-3 w-3 ${iconClassName}`} />
          {statusLabel(status)}
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
  const [busy, setBusy] = useState(false);
  const [refreshed, setRefreshed] = useState(0);

  const isInvitation = member.kind === "invitation";
  const orgId = member.orgId;
  const invitationId = member.invitationId;

  function handleRemove() {
    setConfirmOpen(false);
  }

  async function handleCopyInviteLink() {
    if (!orgId || !invitationId) return;
    setOpen(false);
    setBusy(true);
    try {
      const res = await fetch(`/api/orgs/${orgId}/invitations/${invitationId}/link`, { method: "POST" });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      const link = `${window.location.origin}${data.link}`;
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied to clipboard");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleResendInvitation() {
    if (!orgId || !invitationId) return;
    setOpen(false);
    setBusy(true);
    try {
      const res = await fetch(`/api/orgs/${orgId}/invitations/${invitationId}/resend`, { method: "POST" });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      toast.success("Invitation resent");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdrawInvitation() {
    if (!orgId || !invitationId) return;
    setConfirmOpen(false);
    setBusy(true);
    try {
      const res = await fetch(`/api/orgs/${orgId}/invitations/${invitationId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      toast.success("Invitation withdrawn");
      setRefreshed((n) => n + 1);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (refreshed === 0) return;
    window.dispatchEvent(new CustomEvent("members-refresh"));
  }, [refreshed]);

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 p-1">
          {isInvitation ? (
            <>
              <DropdownMenuItem className="py-0.5" onClick={handleCopyInviteLink} disabled={busy}>
                <Copy className="h-3.5 w-3.5" />
                Copy Invite Link
              </DropdownMenuItem>
              <DropdownMenuItem className="py-0.5" onClick={handleResendInvitation} disabled={busy}>
                <Send className="h-3.5 w-3.5" />
                Resend Invitation
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
            </>
          ) : (
            <>
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
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={isInvitation ? "Withdraw Invitation?" : "Remove Member?"}
        description={
          isInvitation
            ? "The invitation link will stop working and the member won't be able to join. You can send a new invitation later."
            : "Are you sure you want to remove this member? This action cannot be undone."
        }
        confirmLabel={isInvitation ? "Withdraw" : "Remove"}
        cancelLabel="Cancel"
        destructive
        onConfirm={isInvitation ? handleWithdrawInvitation : handleRemove}
      />
    </>
  );
}

export default function MembersPage() {
  const { orgId } = useOrg();
  const { data: session } = useSession();

  const isPlatformAdmin =
    session?.user?.role === "superadmin" || session?.user?.role === "admin";

  const [members, setMembers] = useState<Member[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(loadInitialVisibility);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const needsOrg = !orgId && !isPlatformAdmin;

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

  useEffect(() => {
    if (needsOrg) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    const query = orgId ? `?orgId=${orgId}` : "";
    fetch(`/api/members${query}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setLoadError(data.error);
          setMembers([]);
        } else {
          setMembers(data.members || []);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError("Failed to load members.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId, reload, needsOrg]);

  useEffect(() => {
    const handler = () => setReload((n) => n + 1);
    window.addEventListener("members-refresh", handler);
    return () => window.removeEventListener("members-refresh", handler);
  }, []);

  const table = useReactTable({
    data: members,
    columns,
    state: { sorting, pagination, columnVisibility, rowSelection, globalFilter: debouncedSearch },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    globalFilterFn: memberGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const totalActive = members.filter((m) => m.status === "active").length;
  const totalPending = members.filter((m) => m.status === "invitation_pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Members</h1>
          <AppBreadcrumb />
        </div>
        <Button onClick={() => setInviteOpen(true)} className="h-8 gap-1.5 px-2.5">
          <UserPlus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Invitation Pending</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        {needsOrg ? (
          <div className="p-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Please select an organization from the sidebar before viewing members.
              </AlertDescription>
            </Alert>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading members...
          </div>
        ) : loadError ? (
          <div className="p-6">
            <Alert variant="destructive">
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          </div>
        ) : (
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
        )}
      </div>

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={() => setReload((n) => n + 1)}
      />
    </div>
  );
}

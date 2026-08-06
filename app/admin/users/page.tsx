"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MoreVertical } from "lucide-react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
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
import { TablePagination } from "@/components/tables/table-pagination";

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
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const params = new URLSearchParams({
          limit: "100",
          sortBy: "joined",
          sortOrder: "desc",
        });
        const res = await fetch(`/api/users?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore) setUsers(data.users || []);
        }
      } catch {}
      if (!ignore) setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, []);

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

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const safePage = Math.min(pageIndex, totalPages - 1);
  const pageItems = users.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          Users
        </h1>
        <AppBreadcrumb />
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users found.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 font-medium">Organization</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Joined</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
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
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {user.org_name || "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {session?.user?.id === String(user.id) ? (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {user.role}
                      </span>
                    ) : (
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
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        user.status === "active"
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : user.status === "suspended"
                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5">
                    {session?.user?.id !== String(user.id) && (
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
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <TablePagination
            pageIndex={safePage}
            pageSize={pageSize}
            total={users.length}
            onPageIndexChange={setPageIndex}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

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

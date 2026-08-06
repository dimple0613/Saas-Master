"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell } from "lucide-react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { TablePagination } from "@/components/tables/table-pagination";

interface Notification {
  id: number;
  action: string;
  details: string | null;
  createdAt: string;
  actor: string;
}

const ACTIONS = [
  "impersonate.login",
  "subscription.plan_change",
  "subscription.update",
  "customer.create",
  "customer.update",
  "customer.status_change",
  "customer.delete",
  "admin.create",
  "admin.update",
  "admin.delete",
  "plan.create",
  "plan.update",
  "plan.delete",
  "currency.create",
  "currency.update",
  "currency.delete",
  "gateway.create",
  "gateway.update",
  "gateway.delete",
  "credit.create",
  "credit.update",
  "credit.delete",
  "template.create",
  "template.update",
  "template.delete",
  "blacklist.add",
  "blacklist.remove",
  "role.create",
  "role.update",
  "role.delete",
];

export default function NotificationsPage() {
  const { data: session } = useSession();
  const canView = (session?.user?.permissions || []).includes("log.view");

  const [logs, setLogs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  async function load() {
    setPageIndex(0);
    try {
      const res = await fetch(`/api/logs/notifications?action=${filter}&limit=100`);
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs || []);
      }
    } catch {
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize));
  const safePage = Math.min(pageIndex, totalPages - 1);
  const pageItems = logs.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const grouped = useMemo(() => {
    return pageItems.reduce<Record<string, Notification[]>>((acc, log) => {
      (acc[log.action] = acc[log.action] || []).push(log);
      return acc;
    }, {});
  }, [pageItems]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Notifications &amp; Activity</h1>
        <AppBreadcrumb />
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {!canView && (
        <div className="mb-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">
          You do not have permission to view notifications. Contact a super admin.
        </div>
      )}

      <div className="mb-4 max-w-xs">
        <Select value={filter} onValueChange={(v) => setFilter(String(v))}>
          <SelectTrigger className="h-9 w-full text-sm">
            <span>{filter === "all" ? "All actions" : filter}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([action, entries]) => (
            <div key={action}>
              <h2 className="mb-2 text-sm font-semibold text-foreground">{action}</h2>
              <div className="space-y-2">
                {entries.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="flex items-start gap-3 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Bell className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">
                          {log.details ? (
                            <code className="break-all rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{log.details}</code>
                          ) : (
                            <span className="text-muted-foreground">No details</span>
                          )}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {log.actor} · {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {logs.length > pageSize && (
        <TablePagination
          className="mt-6"
          pageIndex={safePage}
          pageSize={pageSize}
          total={logs.length}
          onPageIndexChange={setPageIndex}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Mail, MailOpen, MousePointerClick, AlertTriangle, Clock } from "lucide-react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LogEntry {
  id: number;
  email: string;
  subject: string | null;
  status: string;
  openedAt: string | null;
  clickedAt: string | null;
  createdAt: string;
}

export default function TrackingLogsPage() {
  const { data: session } = useSession();
  const canView = (session?.user?.permissions || []).includes("log.view");

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [counts, setCounts] = useState({ sent: 0, opened: 0, clicked: 0, bounced: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  async function load() {
    try {
      const res = await fetch(`/api/logs/tracking?status=${tab}&search=${encodeURIComponent(search)}`);
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
  }, [tab]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const statItems = [
    { title: "Sent", value: counts.sent, icon: Mail },
    { title: "Opened", value: counts.opened, icon: MailOpen },
    { title: "Clicked", value: counts.clicked, icon: MousePointerClick },
    { title: "Bounced", value: counts.bounced, icon: AlertTriangle },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Email Tracking</h1>
        <AppBreadcrumb />
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {!canView && (
        <div className="mb-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">
          You do not have permission to view logs. Contact a super admin.
        </div>
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

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          className="h-9 w-full sm:max-w-xs"
          placeholder="Search email or subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") load();
          }}
        />
        <button
          type="button"
          onClick={load}
          className="h-9 rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-muted"
        >
          Search
        </button>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tracking logs found.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Subject</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Opened</th>
                <th className="px-4 py-2.5 font-medium">Clicked</th>
                <th className="px-4 py-2.5 font-medium">Sent</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium text-foreground">{item.email}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{item.subject || "—"}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        item.status === "sent"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : item.status === "opened"
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : item.status === "clicked"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {item.openedAt ? new Date(item.openedAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {item.clickedAt ? new Date(item.clickedAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

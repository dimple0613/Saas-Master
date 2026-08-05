"use client";

import { useTheme } from "@/lib/theme-context";
import { Moon, Sun, Bell, PanelLeft, Menu, X, Search } from "lucide-react";
import { useSyncExternalStore, useEffect, useState, useRef, useCallback } from "react";
import { useOrg } from "@/lib/org-context";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CommandPalette } from "./command-palette";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeSelector } from "./theme-selector";
import { CATEGORY_STYLES, CATEGORY_LABELS } from "@/lib/category-utils";
import { Button } from "@/components/ui/button";

interface ActivityLog {
  id: number;
  action: string;
  category: string;
  details: Record<string, unknown> | null;
  created_at: string;
  user: { first_name: string | null; last_name: string | null; email: string };
  org: { name: string } | null;
}

export function formatAction(action: string, details: Record<string, unknown> | null): string {
  switch (action) {
    case "profile.update":
      return "updated their profile";
    case "password.change":
      return "changed their password";
    case "user.role_change":
      return `changed a user's platform role to ${details?.new_role || "unknown"}`;
    case "user.delete":
      return "deleted a user account";
    case "member.role_change":
      return `changed a member's role to ${details?.new_role || "unknown"}`;
    case "member.remove":
      return "removed a member from the organization";
    case "member.invite":
      return `invited ${details?.email || "someone"} as ${details?.role || "member"}`;
    case "data.create":
      return `added a record "${details?.title || "untitled"}"`;
    case "data.update":
      return `updated a record "${details?.title || "untitled"}"`;
    case "data.delete":
      return "deleted a record";
    case "auth.signup":
      return "created a new account";
    default:
      return action;
  }
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface TopNavProps {
  variant: "admin" | "tenant";
  onToggleCollapse: () => void;
  onToggleMobile: () => void;
}

export function TopNav({ variant, onToggleCollapse, onToggleMobile }: TopNavProps) {
  const { theme, setTheme } = useTheme();
  const { orgId } = useOrg();
  const { data: session } = useSession();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (orgId && session?.user?.role !== "superadmin") params.set("org_id", String(orgId));
      const url = `/api/activity?${params}`;
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) {
        setError(`Error ${res.status}`);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      setError("Failed to load");
    }
    setLoading(false);
  }, [orgId, session]);

  useEffect(() => {
    if (open) fetchLogs();
  }, [open, fetchLogs]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background px-4">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onToggleMobile}
        aria-label="Toggle sidebar"
        className="lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onToggleCollapse}
        aria-label="Toggle sidebar"
        className="hidden lg:inline-flex"
      >
        <PanelLeft className="h-4 w-4" />
      </Button>

      {/* Center Search Bar */}
      <div className="hidden md:flex flex-1 justify-center">
        <button
          onClick={() => setCmdOpen(true)}
          className="flex h-8 w-full max-w-[400px] items-center gap-2 rounded-lg border border-border bg-muted/50 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Search...</span>
        </button>
      </div>

      {/* Mobile search icon */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setCmdOpen(true)}
        aria-label="Search"
        className="md:hidden"
      >
        <Search className="h-4 w-4" />
      </Button>

      <div className="flex-1 md:hidden" />
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
      >
        {mounted ? (
          theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>

      {/* Notification Bell */}
      <div className="relative">
        <Button
          ref={bellRef}
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen(!open)}
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="h-4 w-4" />
          {logs.length > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>

        {open && (
          <div
            ref={dropdownRef}
            className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-border bg-card shadow-lg z-50 flex flex-col"
            style={{ maxHeight: "calc(100vh - 4rem)" }}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "min(320px, calc(100vh - 12rem))" }}>
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading...</div>
              ) : error ? (
                <div className="px-4 py-8 text-center text-sm text-destructive">{error}</div>
              ) : logs.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="border-b border-border px-4 py-2.5 last:border-0 hover:bg-accent/50">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                        {(log.user.first_name || "").charAt(0).toUpperCase() || log.user.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        {log.category && CATEGORY_LABELS[log.category] && (
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none mb-1 ${CATEGORY_STYLES[log.category] || "bg-muted text-muted-foreground"}`}>
                            {CATEGORY_LABELS[log.category]}
                          </span>
                        )}
                        <p className="text-xs text-foreground">
                          <span className="font-medium">{log.user.first_name || log.user.last_name || log.user.email}</span>{" "}
                          {formatAction(log.action, log.details)}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          {log.org && <span className="text-[10px] text-muted-foreground">{log.org.name}</span>}
                          <span className="text-[10px] text-muted-foreground">{timeAgo(log.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-border">
              {variant === "tenant" && (
                <Link
                  href="/app/notifications"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center justify-center px-4 py-2 text-xs font-medium text-primary hover:bg-accent"
                >
                  Show all notifications
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      <ThemeSelector />
      <LanguageSwitcher />
      <CommandPalette variant={variant} open={cmdOpen} onOpenChange={setCmdOpen} />
    </header>
  );
}

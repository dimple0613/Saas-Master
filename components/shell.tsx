"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "./sidebar";
import { TopNav } from "./topnav";
import { OrgProvider, useOrg } from "@/lib/org-context";
import { LanguageProvider } from "@/lib/language-context";
import { CreateOrgModal } from "./create-org-modal";
import { Plus, Settings } from "lucide-react";

interface Org { id: number; name: string; }

export type ShellVariant = "admin" | "tenant";

interface ShellProps {
  variant: ShellVariant;
  children: React.ReactNode;
}

export function Shell({ variant, children }: ShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  const openCreateOrg = useCallback(() => setShowCreateOrg(true), []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    (window as Window & { openCreateOrg?: () => void }).openCreateOrg = openCreateOrg;
  }, [openCreateOrg]);

  return (
    <OrgProvider>
      <LanguageProvider>
      {variant === "tenant" && <OrgDropdown />}
      <UserDropdown variant={variant} />
      <div className="flex min-h-screen bg-background">
        <Sidebar
          variant={variant}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div
          className="flex-1 transition-[margin] duration-200"
          style={{ marginLeft: isDesktop ? (collapsed ? "3rem" : "16rem") : "0" }}
        >
          <TopNav
            variant={variant}
            onToggleCollapse={() => setCollapsed(!collapsed)}
            onToggleMobile={() => setMobileOpen(!mobileOpen)}
          />
          <main className="min-h-[calc(100vh-3.5rem)] bg-muted/50 p-6">{children}</main>
        </div>
      </div>
      <CreateOrgModal open={showCreateOrg} onClose={() => setShowCreateOrg(false)} />
      </LanguageProvider>
    </OrgProvider>
  );
}

function OrgDropdown() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const { orgId: selectedId, setOrg } = useOrg();
  const router = useRouter();

  const loadOrgs = useCallback(async () => {
    try {
      const res = await fetch("/api/orgs");
      if (!res.ok) return;
      const data = await res.json();
      const all: Org[] = [];
      const seen = new Set<number>();
      (data.owned || []).forEach((org: { id: number; name: string }) => {
        all.push({ id: org.id, name: org.name });
        seen.add(org.id);
      });
      (data.memberOf || []).forEach((org: { id: number; name: string; member_role: string }) => {
        if (seen.has(org.id)) return;
        all.push({ id: org.id, name: org.name });
      });
      setOrgs(all);
      if (!selectedId && all.length > 0) setOrg(String(all[0].id), all[0].name);
    } catch {}
  }, [setOrg]);

  useEffect(() => {
    loadOrgs();
    (window as Window & { refreshOrgList?: () => void }).refreshOrgList = loadOrgs;
  }, [loadOrgs]);

  useEffect(() => {
    const handler = (e: CustomEvent<{ top: number; left: number }>) => {
      setPos(e.detail);
      setOpen(true);
    };
    window.addEventListener("open-org-dropdown", handler as EventListener);
    return () => window.removeEventListener("open-org-dropdown", handler as EventListener);
  }, []);

  const selectOrg = (org: Org) => {
    setOrg(String(org.id), org.name);
    setOpen(false);
  };

  const goToOrgSettings = (e: React.MouseEvent | React.KeyboardEvent, orgId: number) => {
    e.stopPropagation();
    setOrg(String(orgId), orgs.find((o) => o.id === orgId)?.name || "");
    setOpen(false);
    router.push(`/app/settings`);
  };

  if (orgs.length === 0) return null;

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[9998] animate-in fade-in duration-150"
        onClick={() => setOpen(false)}
      />
      <div
        className="fixed z-[9999] min-w-[16rem] rounded-md border border-border bg-popover p-1 shadow-lg animate-in fade-in slide-in-from-left-2 duration-200"
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="px-2.5 py-1.5 border-b border-border mb-1">
          <span className="text-xs font-medium text-muted-foreground">Switch organization</span>
        </div>
        {orgs.map((org) => (
          <button
            key={org.id}
            onClick={() => selectOrg(org)}
            className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1 text-sm transition-colors hover:bg-accent
              ${String(org.id) === selectedId ? "bg-accent font-medium" : ""}`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold shrink-0">
              {org.name.charAt(0).toUpperCase()}
            </div>
            <span className="flex-1 truncate text-left">{org.name}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => goToOrgSettings(e, org.id)}
              onKeyDown={(e) => { if (e.key === "Enter") goToOrgSettings(e, org.id); }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              title="Organization settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </span>
          </button>
        ))}
        <div className="h-px bg-border my-0.5" />
        <button
          onClick={() => {
            setOpen(false);
            (window as Window & { openCreateOrg?: () => void }).openCreateOrg?.();
          }}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-border shrink-0">
            <Plus className="h-3.5 w-3.5" />
          </div>
          <span>New organization</span>
        </button>
      </div>
    </>
  );
}

interface UserDropdownProps {
  variant: ShellVariant;
}

function UserDropdown({ variant }: UserDropdownProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ bottom: number; left: number }>({ bottom: 0, left: 0 });
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userInitial, setUserInitial] = useState("");
  const [userImage, setUserImage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = variant === "admin";
  const profileHref = isAdmin ? "/admin/profile" : "/app/profile";

  useEffect(() => {
    const handler = (e: CustomEvent<{ bottom: number; left: number; userName: string; userEmail: string; userInitial: string; userImage: string | null }>) => {
      setPos({ bottom: e.detail.bottom, left: e.detail.left });
      setUserName(e.detail.userName);
      setUserEmail(e.detail.userEmail);
      setUserInitial(e.detail.userInitial);
      setUserImage(e.detail.userImage);
      setOpen(true);
    };
    window.addEventListener("open-user-dropdown", handler as EventListener);
    return () => window.removeEventListener("open-user-dropdown", handler as EventListener);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[9998]"
        onClick={() => setOpen(false)}
      />
      <div
        ref={dropdownRef}
        className="fixed z-[9999] w-64 rounded-xl border border-border bg-card shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"
        style={{ bottom: pos.bottom, left: pos.left }}
      >
        {/* User Info Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          {userImage ? (
            <img
              src={userImage}
              alt={userName}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-semibold text-white">
              {userInitial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </div>

        {/* Menu Items */}
        <div className="p-1.5">
          <Link
            href={profileHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-1 text-sm text-foreground transition-colors hover:bg-accent"
          >
            <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            My Profile
          </Link>

          {!isAdmin && (
            <Link
              href="/app/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-1 text-sm text-foreground transition-colors hover:bg-accent"
            >
              <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Account Settings
            </Link>
          )}

          <Link
            href={profileHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-1 text-sm text-foreground transition-colors hover:bg-accent"
          >
            <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Change Password
          </Link>
        </div>

        <div className="h-px bg-border mx-2" />

        {!isAdmin && (
          <div className="p-1.5">
            <Link
              href="/app/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-1 text-sm text-foreground transition-colors hover:bg-accent"
            >
              <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Notifications
            </Link>
          </div>
        )}

        <div className="h-px bg-border mx-2" />

        <div className="p-1.5">
          <button
            onClick={async () => {
              setOpen(false);
              const { signOut } = await import("next-auth/react");
              signOut({ callbackUrl: "/login" });
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-1 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <svg className="h-4 w-4 shrink-0 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log out
          </button>
        </div>
      </div>
    </>
  );
}

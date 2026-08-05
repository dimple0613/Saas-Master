"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ChevronsUpDown } from "lucide-react";
import { useOrg } from "@/lib/org-context";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

interface OrgSwitcherProps {
  collapsed?: boolean;
}

export function OrgSwitcher({ collapsed }: OrgSwitcherProps) {
  const [orgCount, setOrgCount] = useState(0);
  const { orgName } = useOrg();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { data: session } = useSession();

  const loadOrgs = useCallback(async () => {
    try {
      const res = await fetch("/api/orgs");
      if (!res.ok) return;
      const data = await res.json();
      const total = (data.owned?.length || 0) + (data.memberOf?.length || 0);
      setOrgCount(total);
    } catch {}
  }, []);

  useEffect(() => {
    (window as Window & { refreshOrgList?: () => void }).refreshOrgList = loadOrgs;
  }, [loadOrgs]);

  useEffect(() => {
    loadOrgs();
  }, []);

  if (session?.user?.role === "superadmin") return null;

  const handleClick = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const sidebarRight = (triggerRef.current.closest("aside") || triggerRef.current.parentElement)?.getBoundingClientRect().right ?? rect.right;
      window.dispatchEvent(
        new CustomEvent("open-org-dropdown", { detail: { top: 8, left: sidebarRight + 8 } })
      );
    }
  };

  if (orgCount === 0) return null;

  const displayName = orgName || "Acme Inc.";

  if (collapsed) {
    return (
      <div className="px-2 py-2">
        <Button
          ref={triggerRef}
          size="icon"
          className="mx-auto rounded-full"
          onClick={handleClick}
          title="Switch organization"
        >
          {displayName.charAt(0).toUpperCase()}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button
        ref={triggerRef}
        variant="ghost"
        className="w-full justify-start gap-2 px-3 py-3 h-auto"
        onClick={handleClick}
      >
        <div suppressHydrationWarning className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <span suppressHydrationWarning className="flex-1 text-sm font-semibold text-sidebar-foreground truncate text-left">
          {displayName}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/50" />
      </Button>
    </div>
  );
}

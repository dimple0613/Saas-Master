"use client";

import { useEffect, useState } from "react";
import { Building2, ChevronDown, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AppBreadcrumb } from "@/components/app-breadcrumb";

interface OrgAccount {
  id: number;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  owner: { id: number; email: string; first_name: string | null; last_name: string | null } | null;
  member_count: number;
  subscription: {
    status: string;
    plan: { name: string; slug: string; priceMonthly: string | number };
    ends_at: string | null;
  } | null;
}

interface OwnerGroup {
  owner: { id: number; email: string; first_name: string | null; last_name: string | null };
  orgs: OrgAccount[];
}

export default function AccountsPage() {
  const [groups, setGroups] = useState<OwnerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOwner, setExpandedOwner] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => {
        const orgs: OrgAccount[] = data.orgs || [];
        const map = new Map<number, OwnerGroup>();
        for (const org of orgs) {
          if (!org.owner) continue;
          const key = org.owner.id;
          if (!map.has(key)) {
            map.set(key, { owner: org.owner, orgs: [] });
          }
          map.get(key)!.orgs.push(org);
        }
        setGroups(Array.from(map.values()));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Accounts</h1>
        <AppBreadcrumb />
      </div>

      {groups.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="font-heading mb-1 text-sm font-semibold text-foreground">No organizations</h3>
          <p className="text-sm text-muted-foreground">There are no organizations in the system yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const isExpanded = expandedOwner === group.owner.id;
            const ownerName = [group.owner.first_name, group.owner.last_name].filter(Boolean).join(" ") || group.owner.email;
            return (
              <div key={group.owner.id} className="overflow-hidden rounded-lg border border-border bg-card">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setExpandedOwner(isExpanded ? null : group.owner.id)}
                  className="flex w-full items-center gap-3 rounded-none p-4 text-left hover:bg-accent/50"
                >
                  <Avatar size="sm">
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs">
                      {(group.owner.first_name || "").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{ownerName}</p>
                    <p className="text-xs text-muted-foreground">{group.owner.email}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {group.orgs.length} organization{group.orgs.length !== 1 ? "s" : ""}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </Button>

                {isExpanded && (
                  <div className="border-t border-border px-4 py-3 space-y-2">
                    {group.orgs.map((org) => (
                      <div key={org.id} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent/50">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-foreground">{org.name}</p>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${org.status === "active" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                              {org.status}
                            </span>
                          </div>
                          {org.description && (
                            <p className="text-[11px] text-muted-foreground truncate">{org.description}</p>
                          )}
                        </div>
                        {org.subscription?.plan && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium capitalize text-primary shrink-0">
                            {org.subscription.plan.name}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {org.member_count} member{org.member_count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

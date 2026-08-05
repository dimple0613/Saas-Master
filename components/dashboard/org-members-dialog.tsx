"use client";

import { useEffect, useState, useCallback } from "react";
import { useOrg } from "@/lib/org-context";
import { Users, Trash2, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

interface Member {
  member_id: number;
  role: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface OrgDetail {
  name: string;
  description: string;
  myRole: string;
  owner: { id: number; email: string; first_name: string; last_name: string } | null;
  members: Member[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrgMembersDialog({ open, onOpenChange }: Props) {
  const { orgId, orgName } = useOrg();
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<number | null>(null);

  const loadOrg = useCallback(() => {
    if (!orgId) { setOrg(null); return; }
    setLoading(true);
    fetch(`/api/orgs/${orgId}`)
      .then((r) => r.json())
      .then((data) => {
        setOrg({
          name: data.org?.name || orgName,
          description: data.org?.description || "",
          myRole: data.myRole || "member",
          owner: data.owner || null,
          members: data.members || [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [orgId, orgName]);

  useEffect(() => {
    if (open) {
      loadOrg();
    }
  }, [open, loadOrg]);

  async function updateMemberRole(memberId: number, newRole: string) {
    if (!org) return;
    setOrg({ ...org, members: org.members.map((m) => m.member_id === memberId ? { ...m, role: newRole } : m) });
    await fetch(`/api/orgs/${orgId}/members/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
  }

  async function removeMember(memberId: number) {
    if (org) setOrg({ ...org, members: org.members.filter((m) => m.member_id !== memberId) });
    await fetch(`/api/orgs/${orgId}/members/${memberId}`, { method: "DELETE" });
    setConfirmRemoveMember(null);
  }

  const isOwner = org?.myRole === "owner";
  const totalCount = (org?.members.length || 0) + (org?.owner ? 1 : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {org?.name || orgName} — Members
          </DialogTitle>
          <DialogDescription>
            {loading ? "Loading..." : `${totalCount} member${totalCount !== 1 ? "s" : ""}`}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Loading members...</p>
        ) : !org ? (
          <div className="py-8 text-center">
            <Building2 className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Select an organization from the sidebar first.</p>
          </div>
        ) : (
          <div className="max-h-[65vh] space-y-0 overflow-y-auto pr-1">
            <div className="rounded-lg border border-border">
              {org.owner && (
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      {(org.owner.first_name || "").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{org.owner.first_name} {org.owner.last_name}</p>
                      <p className="text-[11px] text-muted-foreground">{org.owner.email}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600">Owner</span>
                </div>
              )}

              {org.members.map((m) => (
                <div key={m.member_id} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium">
                      {(m.first_name || "").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{m.first_name} {m.last_name}</p>
                      <p className="text-[11px] text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOwner ? (
                      <Select value={m.role} onValueChange={(v) => updateMemberRole(m.member_id, String(v))}>
                        <SelectTrigger className="h-8 w-[90px] text-sm">{m.role.charAt(0).toUpperCase() + m.role.slice(1)}</SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{m.role.charAt(0).toUpperCase() + m.role.slice(1)}</span>
                    )}
                    {isOwner && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setConfirmRemoveMember(m.member_id)}
                        title="Remove member"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {org.members.length === 0 && !org.owner && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">No members found.</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>

      <ConfirmDialog
        open={confirmRemoveMember !== null}
        onOpenChange={(open) => { if (!open) setConfirmRemoveMember(null); }}
        title="Remove Member"
        description="Are you sure you want to remove this member from the organization? They will lose access immediately."
        confirmLabel="Remove"
        destructive
        onConfirm={() => { if (confirmRemoveMember !== null) removeMember(confirmRemoveMember); }}
      />
    </Dialog>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Building2, Users, Trash2, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useOrg } from "@/lib/org-context";
import { AppBreadcrumb } from "@/components/app-breadcrumb";

interface Member {
  member_id: number;
  role: string;
  joined_at: string;
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
}

interface OrgData {
  id: number;
  name: string;
  description: string;
  myRole: string;
  owner: { id: number; email: string; first_name: string; last_name: string };
  members: Member[];
}

export default function OrgDetailPage() {
  const params = useParams();
  const urlOrgId = params.id as string;
  const { orgId: contextOrgId, setOrg: setActiveOrg } = useOrg();
  const activeOrgId = contextOrgId || urlOrgId;
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(() => true);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteError, setInviteError] = useState("");

  const [confirmRemoveMember, setConfirmRemoveMember] = useState<number | null>(null);

  const loadOrg = useCallback(async () => {
    const res = await fetch(`/api/orgs/${activeOrgId}`);
    if (!res.ok) { window.location.href = "/app/organizations"; return; }
    const data = await res.json();
    setActiveOrg(activeOrgId, data.org?.name || "");
    setOrg({
      id: parseInt(activeOrgId),
      name: data.org?.name || "",
      description: data.org?.description || "",
      myRole: data.myRole || "member",
      owner: data.owner,
      members: data.members || [],
    });
    setLoading(false);
  }, [activeOrgId, setActiveOrg]);

  useEffect(() => {
    loadOrg();
  }, [loadOrg]);

  const isOwner = org?.myRole === "owner";
  const canManage = isOwner || org?.myRole === "admin";

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    const res = await fetch(`/api/orgs/${activeOrgId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json();
    if (data.error) { setInviteError(data.error); return; }
    setInviteLink(`${window.location.origin}${data.link}`);
  }

  async function updateMemberRole(memberId: number, newRole: string) {
    if (!org) return;
    setOrg({ ...org, members: org.members.map((m) => m.member_id === memberId ? { ...m, role: newRole } : m) });
    await fetch(`/api/orgs/${activeOrgId}/members/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
  }

  async function removeMember(memberId: number) {
    if (org) setOrg({ ...org, members: org.members.filter((m) => m.member_id !== memberId) });
    await fetch(`/api/orgs/${activeOrgId}/members/${memberId}`, { method: "DELETE" });
    setConfirmRemoveMember(null);
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (!org) return null;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Building2 className="h-6 w-6" /></div>
            <div>
              <h1 className="font-heading text-lg font-semibold tracking-tight text-foreground">{org.name}</h1>
              <AppBreadcrumb />
            </div>
          </div>
          {isOwner && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Owner</span>
          )}
        </div>
        <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Your role: {org.myRole.charAt(0).toUpperCase() + org.myRole.slice(1)}</span>
      </div>

      <div className="mb-4 flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="text-xs font-medium text-foreground">Members</span>
        </div>
        {canManage && (
          <Button
            size="sm"
            onClick={() => { setShowInvite(true); setInviteEmail(""); setInviteRole("member"); setInviteLink(""); setInviteError(""); }}
          >
            <UserPlus className="h-3.5 w-3.5" /> Invite Member
          </Button>
        )}
      </div>

      {showInvite && (
        <Dialog open={showInvite} onOpenChange={(open) => { if (!open) { setShowInvite(false); setInviteLink(""); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" /> Invite Member
              </DialogTitle>
              <DialogDescription>Send an invitation to join {org.name}</DialogDescription>
            </DialogHeader>
            {inviteError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{inviteError}</AlertDescription>
              </Alert>
            )}
            {inviteLink ? (
              <div className="space-y-3">
                <p className="text-sm text-green-600 dark:text-green-400">Invitation created! Copy and share this link.</p>
                <Input value={inviteLink} readOnly className="font-mono text-xs" />
                <Button onClick={() => { setShowInvite(false); setInviteLink(""); }}>Close</Button>
              </div>
            ) : (
              <form onSubmit={sendInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="member@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(String(v))}>
                    <SelectTrigger className="h-8 w-full"><span className="text-sm">{inviteRole === "member" ? "Member (read only)" : "Admin (read + write + invite)"}</span></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member (read only)</SelectItem>
                      <SelectItem value="admin">Admin (read + write + invite)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setShowInvite(false); setInviteLink(""); }}>Cancel</Button>
                  <Button type="submit">Send Invite</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      )}

      <div className="rounded-lg border border-border bg-card">
        <div className="p-4">
          <div className="flex items-center justify-between py-3">
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
          {org.members.map((m) => (
            <div key={m.member_id} className="flex items-center justify-between py-3">
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
                    aria-label="Remove member"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={confirmRemoveMember !== null}
        onOpenChange={(open) => { if (!open) setConfirmRemoveMember(null); }}
        title="Remove Member"
        description="Are you sure you want to remove this member from the organization? They will lose access immediately."
        confirmLabel="Remove"
        destructive
        onConfirm={() => { if (confirmRemoveMember !== null) removeMember(confirmRemoveMember); }}
      />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { Users, UserPlus, Building2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { AppBreadcrumb } from "@/components/app-breadcrumb";

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

export default function SettingsPage() {
  const { orgId, orgName } = useOrg();
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteError, setInviteError] = useState("");

  const [memberToRemove, setMemberToRemove] = useState<number | null>(null);

  const loadOrg = () => {
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
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { loadOrg(); }, [orgId, orgName]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    if (!orgId) return;
    const res = await fetch(`/api/orgs/${orgId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json();
    if (data.error) { setInviteError(data.error); return; }
    setInviteLink(`${window.location.origin}${data.link}`);
  }

  async function updateMemberRole(memberId: number, newRole: string) {
    if (!orgId) return;
    await fetch(`/api/orgs/${orgId}/members/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    loadOrg();
  }

  async function removeMember(memberId: number) {
    if (!orgId) return;
    setMemberToRemove(memberId);
  }

  async function confirmRemoveMember() {
    if (!orgId || memberToRemove == null) return;
    await fetch(`/api/orgs/${orgId}/members/${memberToRemove}`, { method: "DELETE" });
    setMemberToRemove(null);
    loadOrg();
  }

  const isOwner = org?.myRole === "owner";

  if (!mounted) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
          <AppBreadcrumb />
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div suppressHydrationWarning>
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
          <AppBreadcrumb />
        </div>
        <div className="py-16 text-center text-sm text-muted-foreground">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p>Select an organization from the sidebar to view its members.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">{mounted ? orgName : "Organization"} — Members</h1>
        <AppBreadcrumb />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : !org ? (
        <p className="text-sm text-muted-foreground">Could not load organization.</p>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{org.members.length + (org.owner ? 1 : 0)} member{(org.members.length + (org.owner ? 1 : 0)) !== 1 ? "s" : ""}</span>
            </div>
            {isOwner && (
              <Button size="sm" onClick={() => { setShowInvite(true); setInviteEmail(""); setInviteRole("user"); setInviteLink(""); setInviteError(""); }}>
                <UserPlus className="h-3.5 w-3.5" /> Invite Members
              </Button>
            )}
          </div>

          {org.owner && (
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  {(org.owner.first_name || "").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{org.owner.first_name} {org.owner.last_name}</p>
                  <p className="text-xs text-muted-foreground">{org.owner.email}</p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600">Owner</span>
            </div>
          )}

          {org.members.map((m) => (
            <div key={m.member_id} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium">
                  {(m.first_name || "").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{m.first_name} {m.last_name}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isOwner ? (
                  <Select value={m.role} onValueChange={(value) => updateMemberRole(m.member_id, String(value))}>
                    <SelectTrigger className="h-8 text-[11px] font-medium capitalize w-28">
                      <span>{m.role}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary capitalize">{m.role}</span>
                )}
                {isOwner && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeMember(m.member_id)}
                    title="Remove member"
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
      )}

      <Dialog open={showInvite} onOpenChange={(open) => { if (!open) { setShowInvite(false); setInviteLink(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>Send an invitation to join this organization.</DialogDescription>
          </DialogHeader>
          {inviteError && <Alert variant="destructive" className="mb-4"><AlertDescription>{inviteError}</AlertDescription></Alert>}
          {inviteLink ? (
            <div className="space-y-4">
              <p className="text-sm text-green-600 dark:text-green-400">Invitation created! Copy and share this link.</p>
              <div className="space-y-2"><Label className="text-xs text-muted-foreground">Invitation Link</Label><Input value={inviteLink} readOnly className="font-mono text-xs" /></div>
              <Button onClick={() => { setShowInvite(false); setInviteLink(""); }} className="w-full">Close</Button>
            </div>
          ) : (
            <form onSubmit={sendInvite} className="space-y-4">
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="member@example.com" required /></div>
              <div className="space-y-2"><Label>Role</Label>
                <Select value={inviteRole} onValueChange={(value) => setInviteRole(String(value))}>
                  <SelectTrigger className="w-full">
                    <span>{inviteRole === "member" ? "Member (read only)" : "Admin (read + write + invite)"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member (read only)</SelectItem>
                    <SelectItem value="admin">Admin (read + write + invite)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>Close</Button>
                <Button type="submit">Send Invite</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={memberToRemove != null}
        onOpenChange={(open) => { if (!open) setMemberToRemove(null); }}
        title="Remove member"
        description="Remove this member from the organization?"
        confirmLabel="Remove"
        destructive
        onConfirm={confirmRemoveMember}
      />
    </div>
  );
}

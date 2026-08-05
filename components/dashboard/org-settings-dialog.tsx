"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import {
  Users,
  UserPlus,
  Trash2,
  Building2,
  ArrowLeft,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

interface Org {
  id: number;
  name: string;
  description: string;
  created_at: string;
  member_role?: string;
}

interface Member {
  member_id: number;
  role: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface OrgDetail {
  id: number;
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

export function OrgSettingsDialog({ open, onOpenChange }: Props) {
  const { orgId, setOrg } = useOrg();

  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedOrg, setSelectedOrg] = useState<OrgDetail | null>(null);

  const [owned, setOwned] = useState<Org[]>([]);
  const [memberOf, setMemberOf] = useState<Org[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [createError, setCreateError] = useState("");

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteError, setInviteError] = useState("");

  const [memberToRemove, setMemberToRemove] = useState<number | null>(null);

  function loadList() {
    setLoadingList(true);
    fetch("/api/orgs")
      .then((r) => r.json())
      .then((data) => {
        setOwned(data.owned || []);
        setMemberOf(data.memberOf || []);
        setLoadingList(false);
      })
      .catch(() => setLoadingList(false));
  }

  function loadDetail(orgIdNum: number) {
    setLoadingDetail(true);
    fetch(`/api/orgs/${orgIdNum}`)
      .then((r) => r.json())
      .then((data) => {
        setSelectedOrg({
          id: orgIdNum,
          name: data.org?.name || "",
          description: data.org?.description || "",
          myRole: data.myRole || "member",
          owner: data.owner || null,
          members: data.members || [],
        });
        setLoadingDetail(false);
      })
      .catch(() => setLoadingDetail(false));
  }

  useEffect(() => {
    if (open) {
      setShowCreate(false);
      setShowInvite(false);
      if (orgId) {
        setView("detail");
        setSelectedOrg(null);
        loadDetail(parseInt(orgId));
        loadList();
      } else {
        setView("list");
        setSelectedOrg(null);
        loadList();
      }
    }
  }, [open]);

  function goToDetail(orgIdNum: number) {
    setView("detail");
    setSelectedOrg(null);
    loadDetail(orgIdNum);
  }

  function goBack() {
    setView("list");
    setSelectedOrg(null);
    setShowInvite(false);
  }

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    if (!newName.trim()) { setCreateError("Name is required"); return; }
    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDesc }),
    });
    const data = await res.json();
    if (data.error) { setCreateError(data.error); return; }
    setShowCreate(false);
    setNewName("");
    setNewDesc("");
    loadList();
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    if (!selectedOrg) return;
    const res = await fetch(`/api/orgs/${selectedOrg.id}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json();
    if (data.error) { setInviteError(data.error); return; }
    setInviteLink(`${window.location.origin}${data.link}`);
  }

  async function updateMemberRole(memberId: number, newRole: string) {
    if (!selectedOrg) return;
    setSelectedOrg({ ...selectedOrg, members: selectedOrg.members.map((m) => m.member_id === memberId ? { ...m, role: newRole } : m) });
    await fetch(`/api/orgs/${selectedOrg.id}/members/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
  }

  async function removeMember(memberId: number) {
    if (!selectedOrg) return;
    setMemberToRemove(memberId);
  }

  async function confirmRemoveMember() {
    if (!selectedOrg || memberToRemove == null) return;
    setSelectedOrg({ ...selectedOrg, members: selectedOrg.members.filter((m) => m.member_id !== memberToRemove) });
    await fetch(`/api/orgs/${selectedOrg.id}/members/${memberToRemove}`, { method: "DELETE" });
    setMemberToRemove(null);
  }

  function selectAndUse(orgIdNum: number) {
    const allOrgs = [...owned, ...memberOf];
    const found = allOrgs.find((o) => o.id === orgIdNum);
    if (found && setOrg) {
      setOrg(String(orgIdNum), found.name);
    }
    onOpenChange(false);
  }

  const isOwner = selectedOrg?.myRole === "owner";
  const canManage = isOwner || selectedOrg?.myRole === "admin";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl" showCloseButton>
        {view === "list" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Organizations
              </DialogTitle>
              <DialogDescription>
                {loadingList ? "Loading..." : "Select an organization or create a new one."}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
              {showCreate ? (
                <div className="rounded-lg border border-border p-4">
                  <h3 className="font-heading mb-3 text-sm font-medium text-foreground">Create Organization</h3>
                  {createError && (
                    <Alert variant="destructive" className="mb-3">
                      <AlertDescription>{createError}</AlertDescription>
                    </Alert>
                  )}
                  <form onSubmit={createOrg} className="space-y-3">
                    <div className="space-y-2">
                      <Label>Organization Name</Label>
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Organization name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="Description (optional)"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setShowCreate(false); setCreateError(""); }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Create</Button>
                    </div>
                  </form>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowCreate(true); setNewName(""); setNewDesc(""); }}
                  className="flex h-8 w-full border-dashed text-muted-foreground"
                >
                  <Plus className="h-4 w-4" /> New Organization
                </Button>
              )}

              {loadingList ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>
              ) : owned.length === 0 && memberOf.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No organizations yet.</p>
              ) : (
                <>
                  {owned.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">My Organizations</p>
                      <div className="space-y-2">
                        {owned.map((org) => (
                          <div
                            key={org.id}
                            className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                <Building2 className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{org.name}</p>
                      <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600">Owner</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => goToDetail(org.id)}
                                className="gap-1"
                              >
                                <Users className="h-3.5 w-3.5" /> Members
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => selectAndUse(org.id)}
                              >
                                Use
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {memberOf.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Member Of</p>
                      <div className="space-y-2">
                        {memberOf.map((org) => {
                          const roleLabel = org.member_role === "owner" ? "Owner" : org.member_role === "admin" ? "Admin" : "Member";
                          return (
                            <div
                              key={org.id}
                              className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                  <Building2 className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-foreground">{org.name}</p>
                                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{roleLabel}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => goToDetail(org.id)}
                                  className="gap-1"
                                >
                                  <Users className="h-3.5 w-3.5" /> Members
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => selectAndUse(org.id)}
                                >
                                  Use
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={goBack}
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                {selectedOrg?.name || "Organization"}
              </DialogTitle>
              <DialogDescription>
                {loadingDetail
                  ? "Loading..."
                  : selectedOrg?.description || `${selectedOrg?.members.length || 0} member${(selectedOrg?.members.length || 0) !== 1 ? "s" : ""}`}
              </DialogDescription>
            </DialogHeader>

            {loadingDetail ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Loading members...</p>
            ) : !selectedOrg ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Could not load organization.</p>
            ) : (
              <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
                <div className="rounded-lg border border-border">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {selectedOrg.members.length + (selectedOrg.owner ? 1 : 0)} member{(selectedOrg.members.length + (selectedOrg.owner ? 1 : 0)) !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {canManage && !showInvite && (
                      <Button
                        size="sm"
                        onClick={() => { setShowInvite(true); setInviteEmail(""); setInviteRole("member"); setInviteLink(""); setInviteError(""); }}
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Invite
                      </Button>
                    )}
                  </div>

                  {showInvite && (
                    <div className="border-b border-border bg-muted/30 px-4 py-3">
                      {inviteError && (
                        <Alert variant="destructive" className="mb-3">
                          <AlertDescription>{inviteError}</AlertDescription>
                        </Alert>
                      )}
                      {inviteLink ? (
                        <div className="space-y-2">
                          <p className="text-xs text-green-600 dark:text-green-400">Invitation created! Copy and share this link.</p>
                          <Input value={inviteLink} readOnly className="h-8 font-mono text-xs" />
                          <Button onClick={() => { setShowInvite(false); setInviteLink(""); }}>Close</Button>
                        </div>
                      ) : (
                        <form onSubmit={sendInvite} className="space-y-2">
                          <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="member@example.com" required className="h-8 text-xs" />
                          <div className="flex items-center gap-2">
                            <Select value={inviteRole} onValueChange={(value) => setInviteRole(String(value))}>
                              <SelectTrigger className="h-8 flex-1 text-xs">
                                <span>{inviteRole === "member" ? "Member (read only)" : "Admin (read + write + invite)"}</span>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member (read only)</SelectItem>
                                <SelectItem value="admin">Admin (read + write + invite)</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button type="submit" size="sm">Send</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => setShowInvite(false)}>Cancel</Button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {selectedOrg.owner && (
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                          {(selectedOrg.owner.first_name || "").charAt(0).toUpperCase()}
                        </div>
                        <div>
                                  <p className="text-xs font-medium text-foreground">{selectedOrg.owner.first_name} {selectedOrg.owner.last_name}</p>
                                  <p className="text-[11px] text-muted-foreground">{selectedOrg.owner.email}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600">Owner</span>
                    </div>
                  )}

                  {selectedOrg.members.map((m) => (
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
                            onClick={() => removeMember(m.member_id)}
                            title="Remove member"
                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {selectedOrg.members.length === 0 && !selectedOrg.owner && (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">No members found.</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>

      <ConfirmDialog
        open={memberToRemove != null}
        onOpenChange={(open) => { if (!open) setMemberToRemove(null); }}
        title="Remove member"
        description="Remove this member from the organization?"
        confirmLabel="Remove"
        destructive
        onConfirm={confirmRemoveMember}
      />
    </Dialog>
  );
}

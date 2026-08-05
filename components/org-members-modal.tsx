"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { useOrg } from "@/lib/org-context";

interface Member {
  member_id: number;
  role: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface OrgMembersModalProps {
  open: boolean;
  onClose: () => void;
}

export function OrgMembersModal({ open, onClose }: OrgMembersModalProps) {
  const { orgId, orgName } = useOrg();
  const [members, setMembers] = useState<Member[]>([]);
  const [owner, setOwner] = useState<{ first_name: string; last_name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !orgId) return;
    setLoading(true);
    setMembers([]);
    setOwner(null);
    fetch(`/api/orgs/${orgId}`)
      .then((r) => r.json())
      .then((data) => {
        setMembers(data.members || []);
        setOwner(data.owner || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open, orgId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 mx-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">{orgName || "Organization"} — Members</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            {owner && (
              <div className="flex items-center justify-between border-b border-border py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    {(owner.first_name || "").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{owner.first_name} {owner.last_name}</p>
                    <p className="text-xs text-muted-foreground">{owner.email}</p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600">Owner</span>
              </div>
            )}

            {members.map((m) => (
              <div key={m.member_id} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium">
                    {(m.first_name || "").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.first_name} {m.last_name}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary capitalize">{m.role}</span>
              </div>
            ))}

            {!owner && members.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No members found.</p>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="inline-flex h-8 items-center justify-center rounded-md border border-input px-3 text-sm font-medium">Close</button>
        </div>
      </div>
    </div>
  );
}

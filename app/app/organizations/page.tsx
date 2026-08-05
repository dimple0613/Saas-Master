"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import { useOrg } from "@/lib/org-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppBreadcrumb } from "@/components/app-breadcrumb";

interface Org {
  id: number;
  name: string;
  description: string;
  created_at: string;
  member_role?: string;
}

function OrganizationsContent() {
  const { orgId: selectedOrgId, setOrg } = useOrg();
  const router = useRouter();
  const [owned, setOwned] = useState<Org[]>([]);
  const [memberOf, setMemberOf] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgDesc, setOrgDesc] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedOrgId) {
      router.replace(`/app/organizations/${selectedOrgId}`);
      return;
    }
    fetch("/api/orgs").then((r) => r.json()).then((data) => {
      setOwned(data.owned || []);
      setMemberOf(data.memberOf || []);
      setLoading(false);
    });
  }, []);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!orgName.trim()) { setError("Name is required"); return; }
    const res = await fetch("/api/orgs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: orgName, description: orgDesc }) });
    const data = await res.json();
    if (data.error) { setError(data.error); return; }
    setShowCreate(false); setOrgName(""); setOrgDesc("");
  }

  const isEmpty = owned.length === 0 && memberOf.length === 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Organizations</h1>
          <AppBreadcrumb />
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Organization
        </Button>
      </div>

      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) setShowCreate(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
          </DialogHeader>
          {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
          <form onSubmit={createOrg} className="space-y-4">
            <div className="space-y-2"><Label>Organization Name</Label><Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. Acme Corp" /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={orgDesc} onChange={(e) => setOrgDesc(e.target.value)} placeholder="Optional description" /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : isEmpty ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Building2 className="h-6 w-6" /></div>
          <h3 className="font-heading mb-1 text-sm font-semibold text-foreground">No organizations yet</h3>
          <p className="mb-4 text-sm text-muted-foreground">Create one or accept an invitation to get started.</p>
          <Button onClick={() => setShowCreate(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Create Organization</Button>
        </div>
      ) : (
        <div className="space-y-8">
          {owned.length > 0 && (
            <div>
              <h2 className="font-heading mb-3 text-sm font-semibold text-foreground">My Organizations</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {owned.map((org) => {
                  const isSelected = selectedOrgId === String(org.id);
                  return (
                    <Button
                      key={org.id}
                      type="button"
                      variant="ghost"
                      onClick={() => { setOrg(String(org.id), org.name); router.push(`/app/organizations/${org.id}`); }}
                      className={`group relative h-auto w-full rounded-lg p-4 text-left hover:bg-accent ${isSelected ? "border-primary ring-1 ring-primary" : "border-border"}`}
                    >
                      <div className="mb-3 flex w-full items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Building2 className="h-5 w-5" /></div>
                        <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-foreground">{org.name}</p></div>
                      </div>
                      {isSelected && <span className="mb-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Selected</span>}
                      {org.description && <p className="mb-2 text-xs text-muted-foreground">{org.description}</p>}
                      <p className="text-[11px] text-muted-foreground">Created {new Date(org.created_at).toLocaleDateString()}</p>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
          {memberOf.length > 0 && (
            <div>
              <h2 className="font-heading mb-3 text-sm font-semibold text-foreground">Member Of</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {memberOf.map((org) => {
                  const isSelected = selectedOrgId === String(org.id);
                  return (
                    <Button
                      key={org.id}
                      type="button"
                      variant="ghost"
                      onClick={() => { setOrg(String(org.id), org.name); router.push(`/app/organizations/${org.id}`); }}
                      className={`h-auto w-full rounded-lg p-4 text-left hover:bg-accent ${isSelected ? "border-primary ring-1 ring-primary" : "border-border"}`}
                    >
                      <div className="mb-3 flex w-full items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Building2 className="h-5 w-5" /></div>
                        <div><p className="text-sm font-semibold text-foreground">{org.name}</p></div>
                      </div>
                      {isSelected && <span className="mb-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Selected</span>}
                      {org.description && <p className="mb-2 text-xs text-muted-foreground">{org.description}</p>}
                      <p className="text-[11px] text-muted-foreground">Created {new Date(org.created_at).toLocaleDateString()}</p>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrganizationsPage() {
  return <OrganizationsContent />;
}

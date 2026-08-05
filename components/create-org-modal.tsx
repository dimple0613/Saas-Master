"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { useOrg } from "@/lib/org-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface CreateOrgModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateOrgModal({ open, onClose }: CreateOrgModalProps) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const { setOrg } = useOrg();

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Name is required"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: desc }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setCreating(false); return; }
      setOrg(String(data.id), name);
      setName("");
      setDesc("");
      onClose();
      if (typeof window !== "undefined" && (window as Window & { refreshOrgList?: () => void }).refreshOrgList) {
        (window as Window & { refreshOrgList?: () => void }).refreshOrgList!();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
        </DialogHeader>
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />{error}
          </div>
        )}
        <form onSubmit={createOrg} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Organization name"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="Optional description"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrgMembersDialog } from "./org-members-dialog";

export function OrgQuickActions() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return <div className="h-8" />;
  }

  return (
    <>
      <Button variant="outline" className="h-8 gap-1.5 px-2.5" onClick={() => setOpen(true)}>
        <Users className="h-4 w-4" />
        Show Members
      </Button>
      <OrgMembersDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

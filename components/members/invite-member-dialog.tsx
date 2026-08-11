"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { useOrg } from "@/lib/org-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
];

const TIMEZONE_OPTIONS = [
  "(UTC-12:00) International Date Line West",
  "(UTC-11:00) Samoa",
  "(UTC-10:00) Hawaii",
  "(UTC-09:00) Alaska",
  "(UTC-08:00) Pacific Time (US & Canada)",
  "(UTC-07:00) Mountain Time (US & Canada)",
  "(UTC-06:00) Central Time (US & Canada)",
  "(UTC-05:00) Eastern Time (US & Canada)",
  "(UTC-04:00) Atlantic Time (Canada)",
  "(UTC-03:00) Buenos Aires, Georgetown",
  "(UTC-02:00) Mid-Atlantic",
  "(UTC-01:00) Azores",
  "(UTC+00:00) London, Dublin, Edinburgh",
  "(UTC+01:00) Berlin, Rome, Paris",
  "(UTC+02:00) Helsinki, Kyiv, Sofia",
  "(UTC+03:00) Moscow, Baghdad",
  "(UTC+04:00) Dubai, Abu Dhabi",
  "(UTC+05:00) Islamabad, Karachi",
  "(UTC+05:30) Chennai, Kolkata, Mumbai",
  "(UTC+06:00) Dhaka, Astana",
  "(UTC+07:00) Bangkok, Hanoi",
  "(UTC+08:00) Beijing, Singapore, Perth",
  "(UTC+09:00) Tokyo, Seoul, Osaka",
  "(UTC+10:00) Sydney, Melbourne, Canberra",
  "(UTC+11:00) Solomon Islands, New Caledonia",
  "(UTC+12:00) Auckland, Wellington",
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "ar", label: "Arabic" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "hi", label: "Hindi" },
  { value: "ru", label: "Russian" },
];

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InviteMemberDialog({ open, onOpenChange, onSuccess }: InviteMemberDialogProps) {
  const { orgId } = useOrg();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [timezone, setTimezone] = useState("(UTC+00:00) London, Dublin, Edinburgh");
  const [language, setLanguage] = useState("en");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setRole("member");
      setTimezone("(UTC+00:00) London, Dublin, Edinburgh");
      setLanguage("en");
      setError("");
      setLoading(false);
      setSuccess(false);
      setInviteLink("");
      setCopied(false);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) {
      setError("Please select an organization first.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/orgs/${orgId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, firstName, lastName, timezone, language }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setInviteLink(`${window.location.origin}${data.link}`);
      setSuccess(true);
      onSuccess?.();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Invite link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link");
    }
  }

  function handleCancel() {
    if (!loading) onOpenChange(false);
  }

  const roleLabel = ROLE_OPTIONS.find((r) => r.value === role)?.label || role;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false); }}>
      <DialogContent className="sm:max-w-md">
        {success ? (
          <>
            <DialogHeader>
              <DialogTitle>Invitation Sent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                An invitation has been sent to <strong className="text-foreground">{email}</strong> with the{" "}
                <strong className="text-foreground">{roleLabel}</strong> role. The member will set their own
                password when they accept.
              </p>
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Invite link</Label>
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly className="flex-1 font-mono text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyLink}
                    className="gap-1.5"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invite Member</DialogTitle>
            </DialogHeader>
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="invite-first-name" className="mb-1.5 block text-sm font-medium text-foreground">
                    First Name
                  </Label>
                  <Input
                    id="invite-first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="invite-last-name" className="mb-1.5 block text-sm font-medium text-foreground">
                    Last Name
                  </Label>
                  <Input
                    id="invite-last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="invite-email" className="mb-1.5 block text-sm font-medium text-foreground">
                  Email
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="member@example.com"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-foreground">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(String(v))}>
                    <SelectTrigger className="w-full">
                      <span className="capitalize">{roleLabel}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-foreground">Language</Label>
                  <Select value={language} onValueChange={(v) => setLanguage(String(v))}>
                    <SelectTrigger className="w-full">
                      <span className="truncate">
                        {LANGUAGE_OPTIONS.find((l) => l.value === language)?.label}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Timezone</Label>
                <Select value={timezone} onValueChange={(v) => setTimezone(String(v))}>
                  <SelectTrigger className="w-full">
                    <span className="truncate">{timezone}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Sending..." : "Send Invite"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

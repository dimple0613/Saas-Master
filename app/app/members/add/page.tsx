"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, ArrowLeft } from "lucide-react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { useOrg } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const ROLE_OPTIONS = [
  { value: "full_access", label: "Full Access" },
  { value: "read_only", label: "Read Only" },
  { value: "clientes_sophus", label: "Clientes Sophus" },
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

export default function AddMemberPage() {
  const router = useRouter();
  const { orgId } = useOrg();

  const [memberName, setMemberName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("full_access");
  const [timezone, setTimezone] = useState("(UTC+00:00) London, Dublin, Edinburgh");
  const [language, setLanguage] = useState("en");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) {
      setError("Please select an organization first.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/orgs/${orgId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setInviteLink(`${window.location.origin}${data.link}`);
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    router.push("/app/members");
  }

  if (!orgId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Add Member
          </h1>
          <AppBreadcrumb />
        </div>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Please select an organization from the sidebar before adding a member.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Add Member
          </h1>
          <AppBreadcrumb />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invitation Sent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              An invitation has been sent to <strong>{email}</strong> with the{" "}
              <strong>{role}</strong> role.
            </p>
            {inviteLink && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Or share this invitation link
                </Label>
                <Input value={inviteLink} readOnly className="font-mono text-xs" />
              </div>
            )}
            <Separator />
            <div className="flex justify-end">
              <Button onClick={handleCancel}>Back to Members</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Add Member
          </h1>
          <AppBreadcrumb />
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-8 gap-1.5"
          onClick={() => router.push("/app/members")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Member Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Member Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {/* Member Name */}
                <div className="grid gap-2">
                  <Label htmlFor="memberName">Member Name</Label>
                  <Input
                    id="memberName"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="Internal name to identify this member"
                    className="h-8"
                  />
                  <p className="text-xs text-muted-foreground">
                    Internal name to identify this member account.
                  </p>
                </div>

                {/* Timezone + Language */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Timezone</Label>
                    <Select value={timezone} onValueChange={(v) => setTimezone(String(v))}>
                      <SelectTrigger className="h-8 w-full">
                        <span className="text-sm">{timezone}</span>
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
                  <div className="grid gap-2">
                    <Label>Language</Label>
                    <Select value={language} onValueChange={(v) => setLanguage(String(v))}>
                      <SelectTrigger className="h-8 w-full">
                        <span className="text-sm">
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
              </div>
            </CardContent>
          </Card>

          {/* Account Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {/* First Name + Last Name */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className="h-8"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      className="h-8"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="member@example.com"
                    required
                    className="h-8"
                  />
                  <p className="text-xs text-muted-foreground">
                    Login email for this member.
                  </p>
                </div>

                {/* Password + Confirm Password */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-8"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-8"
                    />
                  </div>
                </div>

                {/* Role */}
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(String(v))}>
                    <SelectTrigger className="h-8 w-full">
                      <span className="text-sm">
                        {ROLE_OPTIONS.find((r) => r.value === role)?.label}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Permissions role for this member.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Fixed Bottom Actions */}
          <div className="sticky bottom-0 flex items-center justify-end gap-3 rounded-lg border border-border bg-background px-6 py-4 shadow-sm">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Sending Invite..." : "Send Invite"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

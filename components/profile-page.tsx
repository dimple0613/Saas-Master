"use client";

import { useEffect, useState } from "react";
import { User, Shield, Bell, Monitor } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Profile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  org_name: string;
  role: string;
  created_at: string;
}

interface SessionInfo {
  id: number;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  expiresAt: string;
  isCurrent: boolean;
}

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "notifications" | "sessions">("profile");
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [msg, setMsg] = useState({ type: "" as "" | "success" | "error", text: "" });

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState({ type: "" as "" | "success" | "error", text: "" });

  // Notifications
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSecurity, setNotifSecurity] = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<{ active: SessionInfo[] } | null>(null);

  async function loadSessions() {
    const res = await fetch("/api/sessions");
    const data = await res.json();
    if (data.active) setSessions(data);
  }

  async function revokeSession(id: number) {
    await fetch("/api/sessions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await loadSessions();
  }

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((data) => {
      setProfile(data);
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
    });
    fetch("/api/profile/notifications").then((r) => r.json()).then((data) => {
      setNotifEmail(data.email_notifications);
      setNotifSecurity(data.security_alerts);
      setNotifMarketing(data.marketing_emails);
    });
    loadSessions();
  }, []);

  async function saveProfile() {
    if (!firstName.trim()) { setMsg({ type: "error", text: "First name is required" }); return; }
    const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ first_name: firstName, last_name: lastName }) });
    const data = await res.json();
    if (data.error) { setMsg({ type: "error", text: data.error }); } else {
      setMsg({ type: "success", text: "Profile updated" });
      setProfile((p) => p ? { ...p, first_name: firstName, last_name: lastName } : p);
      setEditing(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg({ type: "", text: "" });
    if (!currentPassword || !newPassword) { setPwMsg({ type: "error", text: "All fields required" }); return; }
    if (newPassword.length < 8) { setPwMsg({ type: "error", text: "Must be at least 8 characters" }); return; }
    if (newPassword !== confirmNewPassword) { setPwMsg({ type: "error", text: "Passwords do not match" }); return; }
    const res = await fetch("/api/profile/password", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
    const data = await res.json();
    if (data.error) { setPwMsg({ type: "error", text: data.error }); } else {
      setPwMsg({ type: "success", text: "Password updated" });
      setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword("");
    }
  }

  async function saveNotifications() {
    await fetch("/api/profile/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email_notifications: notifEmail, security_alerts: notifSecurity, marketing_emails: notifMarketing }) });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Profile</h1>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex flex-col gap-6 md:flex-row">
        {/* Tabs */}
        <TabsList className="flex gap-1 md:flex-col md:border-r md:border-border md:pr-6 h-auto md:h-auto bg-transparent p-0">
          <TabsTrigger value="profile" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors data-[state=active]:bg-accent data-[state=active]:text-foreground data-[state=active]:shadow-none">
            <User className="h-4 w-4" />Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors data-[state=active]:bg-accent data-[state=active]:text-foreground data-[state=active]:shadow-none">
            <Shield className="h-4 w-4" />Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors data-[state=active]:bg-accent data-[state=active]:text-foreground data-[state=active]:shadow-none">
            <Bell className="h-4 w-4" />Notifications
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors data-[state=active]:bg-accent data-[state=active]:text-foreground data-[state=active]:shadow-none">
            <Monitor className="h-4 w-4" />Sessions
          </TabsTrigger>
        </TabsList>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <TabsContent value="profile">
            {profile && (
              <div className="rounded-lg border border-border bg-card p-6">
                {msg.text && (
                  <Alert variant={msg.type === "error" ? "destructive" : "default"} className="mb-4">
                    <AlertDescription>{msg.text}</AlertDescription>
                  </Alert>
                )}
                <div className="mb-6 flex items-center gap-4 border-b border-border pb-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-semibold">
                    {(profile.first_name || profile.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{profile.first_name} {profile.last_name}</p>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="mb-1 block text-xs text-muted-foreground">First Name</Label>
                    {editing ? <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /> : <p className="text-sm font-medium text-foreground">{profile.first_name || "—"}</p>}
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs text-muted-foreground">Last Name</Label>
                    {editing ? <Input value={lastName} onChange={(e) => setLastName(e.target.value)} /> : <p className="text-sm font-medium text-foreground">{profile.last_name || "—"}</p>}
                  </div>
                  <div><Label className="mb-1 block text-xs text-muted-foreground">Email</Label><p className="text-sm font-medium text-foreground">{profile.email}</p></div>
                  <div><Label className="mb-1 block text-xs text-muted-foreground">Role</Label><p className="text-sm font-medium text-foreground capitalize">{profile.role}</p></div>
                  <div><Label className="mb-1 block text-xs text-muted-foreground">Member Since</Label><p className="text-sm font-medium text-foreground">{new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p></div>
                </div>
                <div className="mt-6 flex gap-2 border-t border-border pt-6">
                  {editing ? (
                    <>
                      <Button onClick={saveProfile}>Save</Button>
                      <Button variant="outline" onClick={() => { setEditing(false); setFirstName(profile.first_name || ""); setLastName(profile.last_name || ""); }}>Cancel</Button>
                    </>
                  ) : (
                    <Button onClick={() => setEditing(true)}>Edit Profile</Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="security">
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="font-heading mb-4 text-lg font-semibold text-foreground">Change Password</h2>
                {pwMsg.text && (
                  <Alert variant={pwMsg.type === "error" ? "destructive" : "default"} className="mb-4">
                    <AlertDescription>{pwMsg.text}</AlertDescription>
                  </Alert>
                )}
                <form onSubmit={savePassword} className="space-y-4 max-w-md">
                  <div className="space-y-2"><Label>Current Password</Label><Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></div>
                  <div className="space-y-2"><Label>New Password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Confirm New Password</Label><Input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} /></div>
                  <Button type="submit">Update Password</Button>
                </form>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <div className="rounded-lg border border-border bg-card p-6">
              {[
                { label: "Email Notifications", desc: "Receive email updates about your account", checked: notifEmail, onChange: setNotifEmail },
                { label: "Security Alerts", desc: "Get notified about suspicious activity", checked: notifSecurity, onChange: setNotifSecurity },
                { label: "Marketing Emails", desc: "Receive tips, product updates, and inspiration", checked: notifMarketing, onChange: setNotifMarketing },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between border-b border-border py-4 last:border-0">
                  <div><p className="text-sm font-medium text-foreground">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                  <Switch checked={item.checked} onCheckedChange={item.onChange} />
                </div>
              ))}
              <div className="mt-4"><Button onClick={saveNotifications}>Save Preferences</Button></div>
            </div>
          </TabsContent>
          <TabsContent value="sessions">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-heading mb-1 text-lg font-semibold text-foreground">Active Sessions</h2>
              <p className="mb-4 text-sm text-muted-foreground">Devices currently signed in to your account. Revoking a session signs that device out immediately.</p>
              {!sessions?.active?.length ? (
                <p className="text-sm text-muted-foreground">No active sessions found.</p>
              ) : (
                <div className="space-y-3">
                  {sessions.active.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-md border border-border p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {s.userAgent || "Unknown device"}
                          {s.isCurrent && <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">This device</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.ipAddress ? `${s.ipAddress} · ` : ""}Last active {s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString() : "—"} · Signed in {new Date(s.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" disabled={s.isCurrent} onClick={() => revokeSession(s.id)}>
                        Revoke
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

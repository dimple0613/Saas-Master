"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Settings,
  Mail,
  Server,
  CreditCard,
  Terminal,
  Timer,
  ShieldAlert,
  KeyRound,
  Save,
} from "lucide-react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";

interface Setting {
  key: string;
  value: string | null;
}

const DEFAULT_GENERAL = [
  { key: "app.name", label: "App Name", placeholder: "SaasMaster" },
  { key: "app.logo", label: "Logo URL", placeholder: "https://..." },
  { key: "support.email", label: "Support Email", placeholder: "support@example.com" },
] as const;

const TABS = [
  { id: "general", label: "General", icon: Settings },
  { id: "email", label: "Email", icon: Mail },
  { id: "smtp", label: "SMTP", icon: Server },
  { id: "gateway", label: "Payment Gateways", icon: CreditCard },
  { id: "php", label: "PHP Settings", icon: Terminal },
  { id: "cron", label: "Cron Job", icon: Timer },
  { id: "security", label: "Security", icon: ShieldAlert },
  { id: "system", label: "System", icon: KeyRound },
] as const;

export default function AdminSettingsPage() {
  const { data: session } = useSession();
  const canManage = (session?.user?.permissions || []).includes("system.settings");

  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);
  const [newSettingKey, setNewSettingKey] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const d = await res.json();
        setSettings(d.settings || []);
      }
    } catch {
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const map = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of settings) m.set(s.key, s.value || "");
    return m;
  }, [settings]);

  function getValue(key: string) {
    return map.get(key) ?? "";
  }

  function setValue(key: string, value: string) {
    setSettings((prev) => {
      const existing = prev.find((s) => s.key === key);
      if (existing) return prev.map((s) => (s.key === key ? { ...s, value } : s));
      return [...prev, { key, value }];
    });
  }

  async function saveTab(keys: string[]) {
    setError("");
    setSaved("");
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: keys.map((key) => ({ key, value: getValue(key) })) }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Failed to save settings");
        return;
      }
      setSaved("Settings saved");
      setTimeout(() => setSaved(""), 3000);
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function addSettingKey() {
    const key = newSettingKey.trim().toLowerCase().replace(/\s+/g, ".");
    if (!key || settings.some((s) => s.key === key)) return;
    setSettings((prev) => [...prev, { key, value: "" }]);
    setNewSettingKey("");
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <AppBreadcrumb />
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      {saved && (
        <div className="mb-4 rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">{saved}</div>
      )}

      {!canManage && (
        <div className="mb-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">
          You don&apos;t have permission to manage system settings. Contact a super admin.
        </div>
      )}

      <Tabs defaultValue="general">
        <TabsList className="mb-6 flex-wrap">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5">
                <Icon className="h-4 w-4" /> {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader className="space-y-0 pb-3">
              <CardTitle>General Settings</CardTitle>
              <p className="text-sm text-muted-foreground">Platform-wide identity and defaults.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {DEFAULT_GENERAL.map((f) => (
                <div key={f.key} className="grid gap-1.5 sm:grid-cols-3 sm:items-center">
                  <Label className="font-medium text-foreground">{f.label}</Label>
                  <Input
                    className="sm:col-span-2"
                    value={getValue(f.key)}
                    onChange={(e) => setValue(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
              <div className="grid gap-1.5 sm:grid-cols-3 sm:items-center">
                <Label className="font-medium text-foreground">Default Timezone</Label>
                <Input
                  className="sm:col-span-2"
                  value={getValue("app.timezone")}
                  onChange={(e) => setValue("app.timezone", e.target.value)}
                  placeholder="UTC"
                />
              </div>
              <div className="grid gap-1.5 sm:grid-cols-3 sm:items-center">
                <Label className="font-medium text-foreground">Default Language</Label>
                <Input
                  className="sm:col-span-2"
                  value={getValue("app.language")}
                  onChange={(e) => setValue("app.language", e.target.value)}
                  placeholder="en"
                />
              </div>
              <div className="grid gap-1.5 sm:grid-cols-3 sm:items-center">
                <Label className="font-medium text-foreground">Date Format</Label>
                <Select value={getValue("app.date_format") || "m/d/Y"} onValueChange={(v) => setValue("app.date_format", String(v))}>
                  <SelectTrigger className="sm:col-span-2">
                    <span>{getValue("app.date_format") || "m/d/Y"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m/d/Y">MM/DD/YYYY</SelectItem>
                    <SelectItem value="d/m/Y">DD/MM/YYYY</SelectItem>
                    <SelectItem value="Y-m-d">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm text-foreground">Allow new registrations</p>
                  <p className="text-xs text-muted-foreground">Let new users sign up on the platform.</p>
                </div>
                <Switch
                  checked={getValue("app.registration_enabled") !== "false"}
                  onCheckedChange={(c) => setValue("app.registration_enabled", String(Boolean(c)))}
                />
              </div>
              {canManage && (
                <Button onClick={() => saveTab(["app.name", "app.logo", "support.email", "app.timezone", "app.language", "app.date_format", "app.registration_enabled"])}>
                  <Save className="mr-1.5 h-4 w-4" /> {saving ? "Saving..." : "Save"}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader className="space-y-0 pb-3">
              <CardTitle>Email Settings</CardTitle>
              <p className="text-sm text-muted-foreground">Sender identity used for platform emails.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1.5 sm:grid-cols-3 sm:items-center">
                <Label className="font-medium text-foreground">From Name</Label>
                <Input
                  className="sm:col-span-2"
                  value={getValue("email.from_name")}
                  onChange={(e) => setValue("email.from_name", e.target.value)}
                  placeholder="SaasMaster"
                />
              </div>
              <div className="grid gap-1.5 sm:grid-cols-3 sm:items-center">
                <Label className="font-medium text-foreground">From Email</Label>
                <Input
                  className="sm:col-span-2"
                  type="email"
                  value={getValue("email.from_email")}
                  onChange={(e) => setValue("email.from_email", e.target.value)}
                  placeholder="no-reply@example.com"
                />
              </div>
              {canManage && (
                <Button onClick={() => saveTab(["email.from_name", "email.from_email"])}>
                  <Save className="mr-1.5 h-4 w-4" /> {saving ? "Saving..." : "Save"}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="smtp">
          <Card>
            <CardHeader className="space-y-0 pb-3">
              <CardTitle>SMTP Settings</CardTitle>
              <p className="text-sm text-muted-foreground">Mail server used to deliver platform emails.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  { key: "smtp.host", label: "Host", placeholder: "smtp.example.com" },
                  { key: "smtp.port", label: "Port", placeholder: "587" },
                ] as const
              ).map((f) => (
                <div key={f.key} className="grid gap-1.5 sm:grid-cols-3 sm:items-center">
                  <Label className="font-medium text-foreground">{f.label}</Label>
                  <Input
                    className="sm:col-span-2"
                    value={getValue(f.key)}
                    onChange={(e) => setValue(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
              <div className="grid gap-1.5 sm:grid-cols-3 sm:items-center">
                <Label className="font-medium text-foreground">Encryption</Label>
                <Select value={getValue("smtp.encryption") || "tls"} onValueChange={(v) => setValue("smtp.encryption", String(v))}>
                  <SelectTrigger className="sm:col-span-2">
                    <span className="uppercase">{getValue("smtp.encryption") || "tls"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="tls">TLS</SelectItem>
                    <SelectItem value="ssl">SSL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-3 sm:items-center">
                <Label className="font-medium text-foreground">Username</Label>
                <Input
                  className="sm:col-span-2"
                  value={getValue("smtp.username")}
                  onChange={(e) => setValue("smtp.username", e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div className="grid gap-1.5 sm:grid-cols-3 sm:items-center">
                <Label className="font-medium text-foreground">Password</Label>
                <Input
                  className="sm:col-span-2"
                  type="password"
                  value={getValue("smtp.password")}
                  onChange={(e) => setValue("smtp.password", e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              {canManage && (
                <Button onClick={() => saveTab(["smtp.host", "smtp.port", "smtp.encryption", "smtp.username", "smtp.password"])}>
                  <Save className="mr-1.5 h-4 w-4" /> {saving ? "Saving..." : "Save"}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gateway">
          <Card>
            <CardHeader className="space-y-0 pb-3">
              <CardTitle>Payment Gateway Settings</CardTitle>
              <p className="text-sm text-muted-foreground">Default gateway and currency for billing.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1.5 sm:grid-cols-3 sm:items-center">
                <Label className="font-medium text-foreground">Default Gateway</Label>
                <Select value={getValue("gateway.default") || "stripe"} onValueChange={(v) => setValue("gateway.default", String(v))}>
                  <SelectTrigger className="sm:col-span-2">
                    <span className="capitalize">{getValue("gateway.default") || "stripe"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="paddle">Paddle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-3 sm:items-center">
                <Label className="font-medium text-foreground">Currency</Label>
                <Input
                  className="sm:col-span-2"
                  value={getValue("gateway.currency")}
                  onChange={(e) => setValue("gateway.currency", e.target.value.toUpperCase())}
                  placeholder="USD"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm text-foreground">Sandbox mode</p>
                  <p className="text-xs text-muted-foreground">Process payments in test mode.</p>
                </div>
                <Switch
                  checked={getValue("gateway.sandbox") === "true"}
                  onCheckedChange={(c) => setValue("gateway.sandbox", String(Boolean(c)))}
                />
              </div>
              {canManage && (
                <Button onClick={() => saveTab(["gateway.default", "gateway.currency", "gateway.sandbox"])}>
                  <Save className="mr-1.5 h-4 w-4" /> {saving ? "Saving..." : "Save"}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="php">
          <Card>
            <CardHeader className="space-y-0 pb-3">
              <CardTitle>PHP Settings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Legacy runtime options retained for compatibility. This deployment runs on Node.js.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  { key: "php.binary_path", label: "PHP Binary Path", placeholder: "/usr/bin/php" },
                  { key: "php.upload_limit", label: "Upload Limit", placeholder: "64M" },
                  { key: "php.memory_limit", label: "Memory Limit", placeholder: "128M" },
                ] as const
              ).map((f) => (
                <div key={f.key} className="grid gap-1.5 sm:grid-cols-3 sm:items-center">
                  <Label className="font-medium text-foreground">{f.label}</Label>
                  <Input
                    className="sm:col-span-2 font-mono text-sm"
                    value={getValue(f.key)}
                    onChange={(e) => setValue(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
              {canManage && (
                <Button onClick={() => saveTab(["php.binary_path", "php.upload_limit", "php.memory_limit"])}>
                  <Save className="mr-1.5 h-4 w-4" /> {saving ? "Saving..." : "Save"}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cron">
          <Card>
            <CardHeader className="space-y-0 pb-3">
              <CardTitle>Cron Job Settings</CardTitle>
              <p className="text-sm text-muted-foreground">Schedule used for recurring maintenance tasks.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Cron Command</Label>
                <Input
                  className="font-mono text-sm"
                  value={getValue("cron.command")}
                  onChange={(e) => setValue("cron.command", e.target.value)}
                  placeholder="0 3 * * * /usr/bin/node .../cron.js"
                />
              </div>
              <div className="grid gap-1.5 sm:grid-cols-3 sm:items-center">
                <Label className="font-medium text-foreground">Run Interval (minutes)</Label>
                <Input
                  className="sm:col-span-2"
                  value={getValue("cron.interval")}
                  onChange={(e) => setValue("cron.interval", e.target.value)}
                  placeholder="60"
                />
              </div>
              <div className="grid gap-1.5 sm:grid-cols-3 sm:items-center">
                <Label className="font-medium text-foreground">Last Run</Label>
                <Input
                  className="sm:col-span-2"
                  value={getValue("cron.last_run")}
                  onChange={(e) => setValue("cron.last_run", e.target.value)}
                  placeholder="—"
                />
              </div>
              {canManage && (
                <Button onClick={() => saveTab(["cron.command", "cron.interval", "cron.last_run"])}>
                  <Save className="mr-1.5 h-4 w-4" /> {saving ? "Saving..." : "Save"}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader className="space-y-0 pb-3">
              <CardTitle>Security</CardTitle>
              <p className="text-sm text-muted-foreground">CAPTCHA keys, license verification and maintenance mode.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1.5 sm:grid-cols-3 sm:items-center">
                <Label className="font-medium text-foreground">reCAPTCHA Site Key</Label>
                <Input
                  className="sm:col-span-2 font-mono text-sm"
                  value={getValue("captcha.site_key")}
                  onChange={(e) => setValue("captcha.site_key", e.target.value)}
                  placeholder="Site key"
                />
              </div>
              <div className="grid gap-1.5 sm:grid-cols-3 sm:items-center">
                <Label className="font-medium text-foreground">reCAPTCHA Secret Key</Label>
                <Input
                  className="sm:col-span-2 font-mono text-sm"
                  type="password"
                  value={getValue("captcha.secret_key")}
                  onChange={(e) => setValue("captcha.secret_key", e.target.value)}
                  placeholder="Secret key"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm text-foreground">Verify license</p>
                  <p className="text-xs text-muted-foreground">Validate the platform license key against the server.</p>
                </div>
                <Switch
                  checked={getValue("license.verify_enabled") === "true"}
                  onCheckedChange={(c) => setValue("license.verify_enabled", String(Boolean(c)))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm text-foreground">Maintenance mode</p>
                  <p className="text-xs text-muted-foreground">Show a maintenance notice to visitors.</p>
                </div>
                <Switch
                  checked={getValue("app.maintenance_mode") === "true"}
                  onCheckedChange={(c) => setValue("app.maintenance_mode", String(Boolean(c)))}
                />
              </div>
              {canManage && (
                <Button onClick={() => saveTab(["captcha.site_key", "captcha.secret_key", "license.verify_enabled", "app.maintenance_mode"])}>
                  <Save className="mr-1.5 h-4 w-4" /> {saving ? "Saving..." : "Save"}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader className="space-y-0 pb-3">
              <CardTitle>System Settings</CardTitle>
              <p className="text-sm text-muted-foreground">Raw key/value configuration stored in the database.</p>
            </CardHeader>
            <CardContent>
              {canManage ? (
                <>
                  <div className="mb-4 space-y-3">
                    {settings.map((s) => (
                      <div key={s.key} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Label className="w-56 shrink-0 font-mono text-xs text-foreground">{s.key}</Label>
                        <Input
                          value={s.value || ""}
                          onChange={(e) => setValue(s.key, e.target.value)}
                          placeholder="Value"
                        />
                      </div>
                    ))}
                    {settings.length === 0 && (
                      <p className="text-sm text-muted-foreground">No settings configured yet.</p>
                    )}
                  </div>
                  <div className="mb-4 flex gap-2">
                    <Input
                      value={newSettingKey}
                      onChange={(e) => setNewSettingKey(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSettingKey(); } }}
                      placeholder="new.setting.key"
                      className="max-w-xs font-mono text-sm"
                    />
                    <Button variant="outline" onClick={addSettingKey}>Add Key</Button>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => saveTab(settings.map((s) => s.key))}>
                      <Save className="mr-1.5 h-4 w-4" /> {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="outline" onClick={() => load()}>Discard</Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">You don&apos;t have permission to manage system settings.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, MoreVertical, Pencil, Trash2, Globe, Settings } from "lucide-react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

interface Language {
  id: number;
  code: string;
  name: string;
  region: string | null;
  isActive: boolean;
}

interface Setting {
  key: string;
  value: string | null;
}

export default function AdminSettingsPage() {
  const { data: session } = useSession();
  const canManageLanguages = (session?.user?.permissions || []).includes("languages.manage");
  const canManageSettings = (session?.user?.permissions || []).includes("system.settings");

  const [languages, setLanguages] = useState<Language[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const [showLangForm, setShowLangForm] = useState(false);
  const [editingLang, setEditingLang] = useState<Language | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Language | null>(null);
  const [busy, setBusy] = useState(false);
  const [langForm, setLangForm] = useState({ code: "", name: "", region: "", isActive: true });

  const [newSettingKey, setNewSettingKey] = useState("");

  async function load() {
    try {
      const [langRes, settingsRes] = await Promise.all([
        fetch("/api/languages"),
        fetch("/api/settings"),
      ]);
      if (langRes.ok) {
        const d = await langRes.json();
        setLanguages(d.languages || []);
      }
      if (settingsRes.ok) {
        const d = await settingsRes.json();
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

  function openCreateLang() {
    setEditingLang(null);
    setLangForm({ code: "", name: "", region: "", isActive: true });
    setError("");
    setShowLangForm(true);
  }

  function openEditLang(lang: Language) {
    setEditingLang(lang);
    setLangForm({ code: lang.code, name: lang.name, region: lang.region || "", isActive: lang.isActive });
    setError("");
    setShowLangForm(true);
  }

  async function submitLang(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const url = editingLang ? `/api/languages/${editingLang.id}` : "/api/languages";
      const res = await fetch(url, {
        method: editingLang ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: langForm.code,
          name: langForm.name,
          region: langForm.region || null,
          isActive: langForm.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setBusy(false);
        return;
      }
      setShowLangForm(false);
      await load();
    } catch {
      setError("Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function toggleLang(lang: Language) {
    await fetch(`/api/languages/${lang.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !lang.isActive }),
    });
    await load();
  }

  async function confirmDeleteLang() {
    if (!deleteTarget) return;
    await fetch(`/api/languages/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    await load();
  }

  function updateSetting(key: string, value: string) {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  }

  function addSettingKey() {
    const key = newSettingKey.trim().toLowerCase().replace(/\s+/g, ".");
    if (!key || settings.some((s) => s.key === key)) return;
    setSettings((prev) => [...prev, { key, value: "" }]);
    setNewSettingKey("");
  }

  async function saveSettings() {
    setError("");
    setSaved("");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: settings.map((s) => ({ key: s.key, value: s.value || "" })) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to save settings");
      return;
    }
    setSaved("Settings saved");
    setTimeout(() => setSaved(""), 3000);
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
          <AppBreadcrumb />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      {saved && (
        <div className="mb-4 rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">{saved}</div>
      )}

      <Tabs defaultValue="languages">
        <TabsList className="mb-6">
          <TabsTrigger value="languages" className="gap-1.5">
            <Globe className="h-4 w-4" /> Languages
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-1.5">
            <Settings className="h-4 w-4" /> System Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="languages">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle>Languages</CardTitle>
                <p className="text-sm text-muted-foreground">Languages available across the platform.</p>
              </div>
              {canManageLanguages && (
                <Button onClick={openCreateLang} className="h-8 gap-1.5 px-2.5">
                  <Plus className="h-4 w-4" /> Add Language
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {languages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No languages found.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Code</th>
                        <th className="px-4 py-2.5 font-medium">Name</th>
                        <th className="px-4 py-2.5 font-medium">Region</th>
                        <th className="px-4 py-2.5 font-medium">Status</th>
                        <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {languages.map((lang) => (
                        <tr key={lang.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2.5 font-medium text-foreground">{lang.code}</td>
                          <td className="px-4 py-2.5 text-foreground">{lang.name}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{lang.region || "—"}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                                lang.isActive
                                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {lang.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditLang(lang)}>
                                    <Pencil className="h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => toggleLang(lang)}>
                                    {lang.isActive ? "Deactivate" : "Activate"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(lang)}>
                                    <Trash2 className="h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader className="space-y-0 pb-3">
              <CardTitle>System Settings</CardTitle>
              <p className="text-sm text-muted-foreground">Key/value configuration stored in the database.</p>
            </CardHeader>
            <CardContent>
              {canManageSettings ? (
                <>
                  <div className="mb-4 space-y-3">
                    {settings.map((s) => (
                      <div key={s.key} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Label className="w-56 shrink-0 font-mono text-xs text-foreground">{s.key}</Label>
                        <Input
                          value={s.value || ""}
                          onChange={(e) => updateSetting(s.key, e.target.value)}
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
                    <Button onClick={saveSettings}>Save Settings</Button>
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

      <Dialog open={showLangForm} onOpenChange={(o) => { if (!o) setShowLangForm(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLang ? "Edit Language" : "Add Language"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitLang} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Code</Label>
                <Input value={langForm.code} onChange={(e) => setLangForm({ ...langForm, code: e.target.value })} placeholder="en" required />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-foreground">Name</Label>
                <Input value={langForm.name} onChange={(e) => setLangForm({ ...langForm, name: e.target.value })} placeholder="English" required />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-foreground">Region</Label>
              <Input value={langForm.region} onChange={(e) => setLangForm({ ...langForm, region: e.target.value })} placeholder="e.g. US, GB, optional" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-sm text-foreground">Active</span>
              <Switch
                checked={langForm.isActive}
                onCheckedChange={(c) => setLangForm({ ...langForm, isActive: Boolean(c) })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowLangForm(false)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete language"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}" (${deleteTarget.code})? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDeleteLang}
      />
    </div>
  );
}

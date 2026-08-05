"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Building2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

function InviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [inviteData, setInviteData] = useState<{ email: string; role: string; orgName: string; orgId: number } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(() => !!token);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [logging, setLogging] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!token) return;

    fetch(`/api/invite/validate?token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { setInviteData(data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [token]);

  async function handleAccept() {
    setError("");
    setLogging(true);
    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else { setJoined(true); }
    } catch {
      setError("Something went wrong");
    } finally {
      setLogging(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLogging(true);
    try {
      const result = await signIn("credentials", { email: inviteData!.email, password, redirect: false });
      if (result?.error) { setError("Invalid credentials"); setLogging(false); return; }
      await handleAccept();
    } catch {
      setError("Something went wrong");
      setLogging(false);
    }
  }

  const roleLabel = inviteData?.role === "owner" ? "Owner" : inviteData?.role === "admin" ? "Admin" : "Member";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4 py-[70px] max-sm:py-12">
      <div className="w-full max-w-[800px]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="grid min-h-[520px] md:grid-cols-2">
            {/* Left - Form */}
            <div className="flex flex-col p-8">
              <h1 className="font-heading mb-2 text-center text-2xl font-bold tracking-tight text-foreground">Accept Invitation</h1>
              <p className="mb-6 text-center text-sm text-muted-foreground">You&apos;ve been invited to join an organization.</p>

              {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

              {!token && !loading && (
                <div className="text-center">
                  <p className="mb-4 text-sm text-muted-foreground">Invalid invitation link.</p>
                  <Button variant="outline" render={<Link href="/login" />} className="h-8">
                    Go to Login
                  </Button>
                </div>
              )}

              {inviteData && !joined && (
                <div className="space-y-4">
                  <div className="rounded-md border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{inviteData.orgName}</p>
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{roleLabel}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">Please log in or sign up with <strong>{inviteData.email}</strong> to accept.</p>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required className="h-8 px-3 pr-9" />
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => setShowPassword(!showPassword)} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <Button type="submit" disabled={logging} className="h-8 w-full">
                      {logging ? "Joining..." : "Log In & Accept"}
                    </Button>
                  </form>

                  <p className="text-center text-sm text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <Link href={`/signup?invite_token=${token}`} className="font-medium text-foreground underline underline-offset-4">
                      Sign up
                    </Link>
                  </p>
                </div>
              )}

              {joined && (
                <div className="text-center space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 mx-auto text-green-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h2 className="font-heading text-lg font-semibold text-foreground">Welcome!</h2>
                  <p className="text-sm text-muted-foreground">You&apos;ve joined <strong>{inviteData?.orgName}</strong>.</p>
                  <Button render={<Link href="/app" />} className="h-8 w-full">
                    Go to Dashboard
                  </Button>
                </div>
              )}

              <p className="mt-auto pt-6 text-center text-sm text-muted-foreground">
                <Link href="/login" className="font-medium text-foreground underline underline-offset-4">Back to Sign In</Link>
              </p>
            </div>

            {/* Right - Image Placeholder */}
            <div className="relative hidden md:block">
              <img
                src="/auth-invite-illustration.svg"
                alt="SaaS Platform illustration"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background"><p className="text-sm text-muted-foreground">Loading...</p></div>}>
      <InviteContent />
    </Suspense>
  );
}

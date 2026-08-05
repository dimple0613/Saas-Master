"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { safeCallbackUrl } from "@/lib/safe-redirect";

function SignupContent() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite_token");

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", orgName: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteData, setInviteData] = useState<{ email: string; role: string; orgName: string; orgId: number } | null>(null);
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken);
  const router = useRouter();

  useEffect(() => {
    if (!inviteToken) return;
    fetch(`/api/invite/validate?token=${encodeURIComponent(inviteToken)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setInviteData(data);
        setForm((prev) => ({ ...prev, email: data.email || "", orgName: "" }));
        setInviteLoading(false);
      })
      .catch(() => { setInviteLoading(false); });
  }, [inviteToken]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setError("All fields are required");
      return;
    }
    if (!inviteToken && !form.orgName) {
      setError("Organization name is required");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          orgName: form.orgName || "Invited Organization",
          password: form.password,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      if (inviteToken) {
        const signInResult = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
        if (signInResult?.error) {
          setSuccess("Account created! Redirecting to login...");
          setTimeout(() => router.push(`/login?callbackUrl=/invite?token=${inviteToken}`), 1500);
          return;
        }

        const acceptRes = await fetch("/api/invite/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: inviteToken }),
        });
        const acceptData = await acceptRes.json();
        if (acceptData.error) {
          setSuccess("Account created! Redirecting to login...");
          setTimeout(() => router.push(`/login?callbackUrl=/invite?token=${inviteToken}`), 1500);
          return;
        }

        setSuccess("Welcome! You've joined the organization.");
        setTimeout(() => router.push("/app"), 1500);
      } else {
        setSuccess("Account created successfully! Redirecting to login...");
        setTimeout(() => router.push("/login"), 1500);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

  if (inviteLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4 py-[70px] max-sm:py-12">
        <p className="text-sm text-muted-foreground">Loading invitation...</p>
      </div>
    );
  }

  if (inviteToken && !inviteData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4 py-[70px] max-sm:py-12">
        <div className="w-full max-w-[800px]">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="grid min-h-[520px] md:grid-cols-2">
              <div className="flex flex-col items-center justify-center p-8">
                <div className="mb-8 text-center">
                  <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                    Invalid Invitation
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This invitation link is invalid or has expired.
                  </p>
                </div>
                <Alert variant="destructive" className="mb-6 w-full">
                  <AlertDescription>Invalid or expired invitation link.</AlertDescription>
                </Alert>
                <Button
                  render={<Link href="/login" />}
                  className="h-8 w-full rounded-lg bg-foreground text-sm font-medium text-background hover:bg-foreground/90"
                >
                  Go to Login
                </Button>
              </div>
              <div className="relative hidden overflow-hidden md:block">
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,#000_0%,#171717_55%,#262626_100%)]" />
                <img
                  src="/auth-signup-illustration.svg"
                  alt="SaaS Platform illustration"
                  className="relative h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4 py-[70px] max-sm:py-12">
      <div className="w-full max-w-[800px]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="grid min-h-[520px] md:grid-cols-2">
            {/* Left - Form */}
            <div className="flex flex-col p-8">
              <div className="mb-6 text-center">
                <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                  {inviteToken ? "Accept Invitation" : "Create an account"}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {inviteToken
                    ? <>You&apos;ve been invited to join <strong>{inviteData?.orgName}</strong>.</>
                    : "Enter your details to get started"
                  }
                </p>
              </div>

              {/* Invite Info */}
              {inviteData && (
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-border p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{inviteData.orgName}</p>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">{inviteData.role}</span>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium text-foreground">First Name</Label>
                    <Input id="firstName" type="text" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder="John" required className="h-8 rounded-lg border-border bg-card px-3 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-foreground/10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium text-foreground">Last Name</Label>
                    <Input id="lastName" type="text" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} placeholder="Doe" required className="h-8 rounded-lg border-border bg-card px-3 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-foreground/10" />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="m@example.com" required readOnly={!!inviteToken} autoComplete="email" className={`h-8 rounded-lg border-border bg-card px-3 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-foreground/10 ${inviteToken ? "cursor-not-allowed opacity-60" : ""}`} />
                  {inviteToken && <p className="text-xs text-muted-foreground">Pre-filled from your invitation.</p>}
                </div>

                {/* Organization Name (normal signup only) */}
                {!inviteToken && (
                  <div className="space-y-2">
                    <Label htmlFor="orgName" className="text-sm font-medium text-foreground">Organization Name</Label>
                    <Input id="orgName" type="text" value={form.orgName} onChange={(e) => update("orgName", e.target.value)} placeholder="Acme Inc." required className="h-8 rounded-lg border-border bg-card px-3 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-foreground/10" />
                  </div>
                )}

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Create a password" required autoComplete="new-password" className="h-8 rounded-lg border-border bg-card px-3 pr-9 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-foreground/10" />
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => setShowPassword(!showPassword)} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirm Password</Label>
                  <div className="relative">
                    <Input id="confirmPassword" type={showPassword ? "text" : "password"} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} placeholder="Confirm your password" required autoComplete="new-password" className="h-8 rounded-lg border-border bg-card px-3 pr-9 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-foreground/10" />
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => setShowPassword(!showPassword)} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Error */}
                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

                {/* Success */}
                {success && <Alert><AlertDescription className="text-green-600 dark:text-green-400">{success}</AlertDescription></Alert>}

                {/* Submit */}
                <Button type="submit" disabled={loading} className="h-8 w-full rounded-lg bg-foreground text-sm font-medium text-background hover:bg-foreground/90">
                  {loading ? "Creating..." : inviteToken ? "Create Account & Join" : "Create Account"}
                </Button>
              </form>

              {/* Social Logins (normal signup only) */}
              {!inviteToken && (
                <>
                  <div className="my-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">Or continue with</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="flex justify-center gap-3">
                    <Button type="button" variant="outline" onClick={() => signIn("apple", { callbackUrl })} className="h-9 w-9 rounded-full" aria-label="Continue with Apple">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.98-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                      </svg>
                    </Button>
                    <Button type="button" variant="outline" onClick={() => signIn("google", { callbackUrl })} className="h-9 w-9 rounded-full" aria-label="Continue with Google">
                      <span className="text-lg font-bold">G</span>
                    </Button>
                  </div>
                </>
              )}

              {/* Sign in link */}
              <p className="mt-auto pt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                {inviteToken ? (
                  <Link href={`/login?callbackUrl=/invite?token=${inviteToken}`} className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80">Sign in</Link>
                ) : (
                  <Link href="/login" className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80">Sign in</Link>
                )}
              </p>
            </div>

            {/* Right - Image Placeholder */}
            <div className="relative hidden overflow-hidden md:block">
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,#000_0%,#171717_55%,#262626_100%)]" />
              <img
                src="/auth-signup-illustration.svg"
                alt="SaaS Platform illustration"
                className="relative h-full w-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Terms */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By clicking continue, you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">Terms of Service</Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/50">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}

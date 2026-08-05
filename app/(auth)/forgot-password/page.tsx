"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSent(true);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4 py-[70px] max-sm:py-12">
      <div className="w-full max-w-[800px]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="grid min-h-[520px] md:grid-cols-2">
            {/* Left - Form */}
            <div className="flex flex-col p-8">
              <div className="mb-8 text-center">
                <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                  Forgot password?
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter your email and we&apos;ll send you a reset link
                </p>
              </div>

              {sent ? (
                <div className="space-y-5">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      If an account exists for <strong>{email}</strong>, a reset link is on its way. Check your inbox (and spam folder).
                    </AlertDescription>
                  </Alert>
                  <Button
                    render={<Link href="/login" />}
                    className="h-8 w-full rounded-lg bg-foreground text-sm font-medium text-background hover:bg-foreground/90"
                  >
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-foreground">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="m@example.com"
                      required
                      autoComplete="email"
                      className="h-8 rounded-lg border-border bg-card px-3 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-foreground/10"
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-8 w-full rounded-lg bg-foreground text-sm font-medium text-background hover:bg-foreground/90"
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              )}

              {/* Back to sign in */}
              <p className="mt-auto pt-6 text-center text-sm text-muted-foreground">
                <Link
                  href="/login"
                  className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
                >
                  Back to Sign In
                </Link>
              </p>
            </div>

            {/* Right - Image Placeholder */}
            <div className="hidden items-center justify-center bg-muted md:flex">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted-foreground/10">
                <svg
                  className="h-10 w-10 text-muted-foreground/40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

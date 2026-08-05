import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for SaaS Platform",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to login
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: August 5, 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-base font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="mt-2">
              By accessing or using SaaS Platform (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">2. Accounts</h2>
            <p className="mt-2">
              You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">3. Acceptable Use</h2>
            <p className="mt-2">
              You agree not to misuse the Service, including attempting to access the accounts of other users, interfering with the operation of the Service, or using the Service for any unlawful purpose.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">4. Termination</h2>
            <p className="mt-2">
              We may suspend or terminate your access to the Service at any time if we believe you have violated these terms. Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">5. Limitation of Liability</h2>
            <p className="mt-2">
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind. To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising out of your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">6. Changes to These Terms</h2>
            <p className="mt-2">
              We may update these Terms from time to time. We will notify you of any material changes by posting the updated terms on this page. Continued use of the Service after changes constitutes acceptance.
            </p>
          </section>
        </div>

        <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>
            Questions about these terms?{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
              Read our Privacy Policy
            </Link>
            .
          </p>
        </footer>
      </div>
    </div>
  );
}

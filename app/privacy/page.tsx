import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for SaaS Platform",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to login
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: August 5, 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-base font-semibold text-foreground">1. Information We Collect</h2>
            <p className="mt-2">
              We collect information you provide directly, such as your name, email address, and password, as well as information about how you use the Service, such as activity logs and organization data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">2. How We Use Information</h2>
            <p className="mt-2">
              We use the information we collect to provide, maintain, and improve the Service, to authenticate your access, and to communicate with you about your account and the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">3. Data Security</h2>
            <p className="mt-2">
              We take reasonable measures to protect your information from unauthorized access, alteration, or destruction, including encryption of data in transit and at rest.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">4. Data Sharing</h2>
            <p className="mt-2">
              We do not sell your personal information. We may share data only with service providers who help us operate the Service, and only to the extent necessary to provide it.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">5. Your Choices</h2>
            <p className="mt-2">
              You may access, update, or delete your account information at any time from your account settings. You may also contact us to request deletion of your data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">6. Changes to This Policy</h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. We will post any changes on this page, and material changes will be communicated to you directly.
            </p>
          </section>
        </div>

        <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>
            Questions about privacy?{" "}
            <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
              Read our Terms of Service
            </Link>
            .
          </p>
        </footer>
      </div>
    </div>
  );
}

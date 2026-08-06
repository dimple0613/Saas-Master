"use client";

import Link from "next/link";
import { Users, CreditCard, Building2, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

const LINKS = [
  {
    title: "Customers",
    description: "Manage customer accounts and subscriptions",
    href: "/admin/customers",
    icon: Users,
  },
  {
    title: "Plans",
    description: "Create and manage pricing plans",
    href: "/admin/plans",
    icon: CreditCard,
  },
  {
    title: "Accounts",
    description: "Review organizations and their owners",
    href: "/admin/accounts",
    icon: Building2,
  },
  {
    title: "Roles & Permissions",
    description: "Configure roles and access rights",
    href: "/admin/roles",
    icon: ShieldCheck,
  },
];

export function QuickLinks() {
  return (
    <section>
      <h2 className="font-heading mb-3 text-sm font-semibold text-foreground">Quick Links</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="group/card flex h-full items-center justify-center p-6 text-center transition-colors hover:bg-accent/50 hover:ring-primary/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover/card:scale-105">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-heading mt-3 text-sm font-semibold text-foreground">{link.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{link.description}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

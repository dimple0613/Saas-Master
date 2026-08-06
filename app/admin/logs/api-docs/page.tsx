"use client";

import { BookOpen, Lock, ShieldCheck, Server } from "lucide-react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { Card, CardContent } from "@/components/ui/card";

interface Endpoint {
  method: string;
  path: string;
  auth: string;
  description: string;
}

const SECTIONS: { title: string; icon: typeof Server; endpoints: Endpoint[] }[] = [
  {
    title: "Finance",
    icon: Server,
    endpoints: [
      { method: "GET", path: "/api/currencies", auth: "Any authenticated", description: "All currencies ordered by name" },
      { method: "POST", path: "/api/currencies", auth: "currency.manage", description: "Add a currency (code must be unique, uppercased)" },
      { method: "PUT", path: "/api/currencies/[id]", auth: "currency.manage", description: "Update name, code, symbol, format, active flag" },
      { method: "DELETE", path: "/api/currencies/[id]", auth: "currency.manage", description: "Delete a currency" },
      { method: "GET", path: "/api/gateways", auth: "Any authenticated", description: "All payment gateways" },
      { method: "POST", path: "/api/gateways", auth: "gateway.manage", description: "Add a gateway. Body: { name, type, config?, isActive? }" },
      { method: "PUT", path: "/api/gateways/[id]", auth: "gateway.manage", description: "Update gateway fields or toggle active" },
      { method: "DELETE", path: "/api/gateways/[id]", auth: "gateway.manage", description: "Delete a gateway" },
      { method: "GET", path: "/api/credit-packages", auth: "Any authenticated", description: "All credit packages ordered by credits" },
      { method: "POST", path: "/api/credit-packages", auth: "credit.manage", description: "Add a package. Body: { name, credits, price, isVisible?, isActive? }" },
      { method: "PUT", path: "/api/credit-packages/[id]", auth: "credit.manage", description: "Update a package (price/credits/visibility)" },
      { method: "DELETE", path: "/api/credit-packages/[id]", auth: "credit.manage", description: "Delete a package" },
    ],
  },
  {
    title: "Subscriptions",
    icon: Server,
    endpoints: [
      { method: "GET", path: "/api/subscriptions", auth: "subscription.view", description: "All subscriptions with org, plan, credits, subscribers, renewal" },
      { method: "PATCH", path: "/api/subscriptions", auth: "plan.manage", description: "Change an org's plan. Body: { orgId, planId }" },
      { method: "PATCH", path: "/api/subscriptions/[id]", auth: "subscription.manage", description: "Update status / autoRenew / credits on a subscription" },
    ],
  },
  {
    title: "Admins & Customers",
    icon: Server,
    endpoints: [
      { method: "GET", path: "/api/admins", auth: "admin.manage", description: "List admin accounts with group" },
      { method: "POST", path: "/api/admins", auth: "admin.manage", description: "Create an admin. Body: { email, password, firstName?, lastName?, role?, adminGroupId? }" },
      { method: "PUT", path: "/api/admins/[id]", auth: "admin.manage", description: "Update admin fields, role, status, or password" },
      { method: "DELETE", path: "/api/admins/[id]", auth: "admin.manage", description: "Deactivate an admin (moved to inactive customers)" },
      { method: "GET", path: "/api/admin-groups", auth: "Any authenticated", description: "List admin groups with member counts" },
      { method: "POST", path: "/api/admin-groups", auth: "admin.manage", description: "Create an admin group" },
      { method: "PUT", path: "/api/admin-groups/[id]", auth: "admin.manage", description: "Update a group" },
      { method: "DELETE", path: "/api/admin-groups/[id]", auth: "admin.manage", description: "Delete a group (admins unassigned)" },
      { method: "POST", path: "/api/admin/impersonate", auth: "impersonate", description: "Login As another user. Body: { userId }. Swaps in a signed session cookie" },
      { method: "GET", path: "/api/customers", auth: "user.manage", description: "List customers (kind=customer) with plan/credits/subscribers. Query: search" },
      { method: "POST", path: "/api/customers", auth: "user.manage", description: "Create a customer. Body: { email, password, firstName?, lastName?, timezone?, language?, company? }" },
      { method: "PATCH", path: "/api/customers", auth: "user.manage", description: "Enable/disable a customer. Body: { id, status }" },
      { method: "PUT", path: "/api/customers/[id]", auth: "user.manage", description: "Update customer fields or password" },
      { method: "DELETE", path: "/api/customers/[id]", auth: "user.manage", description: "Disable a customer" },
    ],
  },
  {
    title: "Templates",
    icon: Server,
    endpoints: [
      { method: "GET", path: "/api/templates", auth: "Any authenticated", description: "All email templates" },
      { method: "POST", path: "/api/templates", auth: "template.manage", description: "Create a template. Body: { name, slug, category?, html?, isActive? }" },
      { method: "PUT", path: "/api/templates/[id]", auth: "template.manage", description: "Update a template" },
      { method: "DELETE", path: "/api/templates/[id]", auth: "template.manage", description: "Delete a template" },
    ],
  },
  {
    title: "Logs & Monitor",
    icon: Server,
    endpoints: [
      { method: "GET", path: "/api/logs/tracking", auth: "log.view", description: "Email tracking logs with status counts. Query: status, search" },
      { method: "GET", path: "/api/logs/blacklist", auth: "log.view", description: "Blacklist entries" },
      { method: "POST", path: "/api/logs/blacklist", auth: "log.view", description: "Block an email or domain. Body: { emailOrDomain, reason? }" },
      { method: "DELETE", path: "/api/logs/blacklist/[id]", auth: "log.view", description: "Remove an entry from the blacklist" },
      { method: "GET", path: "/api/logs/notifications", auth: "log.view", description: "Recent system activity. Query: action, limit" },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-green-500/10 text-green-600 dark:text-green-400",
  POST: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  PUT: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  PATCH: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  DELETE: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function ApiDocsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">API Reference</h1>
        <AppBreadcrumb />
      </div>

      <Card className="mb-6">
        <CardContent className="flex items-start gap-3 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-4 w-4" />
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Authentication</p>
            <p className="mt-1">
              All endpoints are App Router route handlers under <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">/api</code>.
              Requests are authenticated with the session cookie; handlers return{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">401</code> when unauthenticated and{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">403</code> when the caller lacks the required permission.
              Authorization is re-derived from the database on every request via{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">hasSystemPermission</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      {SECTIONS.map((section) => (
        <div key={section.title} className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
            <section.icon className="h-4 w-4 text-primary" />
            {section.title}
          </h2>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Method</th>
                  <th className="px-4 py-2.5 font-medium">Path</th>
                  <th className="px-4 py-2.5 font-medium">Auth</th>
                  <th className="px-4 py-2.5 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {section.endpoints.map((ep, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">
                      <span className={`rounded px-2 py-0.5 font-mono text-xs font-semibold ${METHOD_COLORS[ep.method]}`}>
                        {ep.method}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-foreground">{ep.path}</td>
                    <td className="px-4 py-2.5 text-xs">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <ShieldCheck className="h-3 w-3" />
                        {ep.auth}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{ep.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <Card>
        <CardContent className="flex items-start gap-3 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Full documentation</p>
            <p className="mt-1">
              The complete endpoint reference, including auth flows, roles &amp; permissions, is maintained in the{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">docs/</code> folder of the repository
              (<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">docs/API_REFERENCE.md</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">docs/ROLES_AND_PERMISSIONS.md</code>).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

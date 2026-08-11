"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, ChevronUp, Users, Bell, Settings, CreditCard, Shield, LayoutDashboard, ShieldCheck, LayoutGrid, Coins, Wallet, Package, FileText, Languages, Send, Ban, BookOpen, User, UserCog } from "lucide-react";
import { OrgSwitcher } from "./org-switcher";
import type { ShellVariant } from "./shell";

interface SidebarProps {
  variant: ShellVariant;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ variant, collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const navItems = getNavItems(variant);

  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const userImage = session?.user?.image || null;
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-full bg-background border-r border-sidebar-border transition-all duration-200
          ${collapsed ? "w-12" : "w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0`}
      >
        <div className="flex h-full flex-col">
          {variant === "admin" ? <AdminBrand collapsed={collapsed} /> : <OrgSwitcher collapsed={collapsed} />}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-2 py-2">
            {navItems.map((section) => (
              <div key={section.key} className="mb-2">
                {!collapsed && section.label && (
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {section.label}
                  </div>
                )}
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors
                        ${collapsed ? "justify-center" : ""}
                        ${isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                        }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Footer - User Profile Card */}
          <div className="p-2">
            <button
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const sidebarRight = (e.currentTarget.closest("aside") || e.currentTarget.parentElement)?.getBoundingClientRect().right ?? rect.right;
                window.dispatchEvent(
                  new CustomEvent("open-user-dropdown", {
                    detail: {
                      bottom: window.innerHeight - rect.top,
                      left: sidebarRight + 8,
                      userName,
                      userEmail,
                      userInitial,
                      userImage,
                    },
                  })
                );
              }}
              className={`flex w-full items-center gap-3 rounded-xl border border-sidebar-border bg-background p-2.5 text-sm transition-all hover:bg-sidebar-accent hover:shadow-sm
                ${collapsed ? "justify-center px-0" : ""}`}
              title={userName}
            >
              {userImage ? (
                <img
                  src={userImage}
                  alt={userName}
                  className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-sidebar-border"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-semibold text-white ring-2 ring-sidebar-border">
                  {userInitial}
                </div>
              )}
              {!collapsed && (
                <>
                  <div className="flex min-w-0 flex-1 flex-col items-start">
                    <span className="truncate text-sm font-medium text-sidebar-foreground">
                      {userName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {userEmail}
                    </span>
                  </div>
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function AdminBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={`flex h-14 items-center gap-2 border-b border-sidebar-border ${collapsed ? "justify-center px-0" : "px-4"}`}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
        E
      </div>
      {!collapsed && (
        <span className="truncate text-sm font-semibold text-sidebar-foreground">EvalEtParking Admin</span>
      )}
    </div>
  );
}

function getNavItems(variant: ShellVariant) {
  if (variant === "admin") {
    return [
      {
        key: "overview",
        label: "Overview",
        items: [
          { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
        ],
      },
      {
        key: "people",
        label: "People",
        items: [
          { label: "Members", href: "/app/members", icon: Users },
          { label: "Users", href: "/admin/users", icon: UserCog },
        ],
      },
      {
        key: "billing",
        label: "Billing",
        items: [
          { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
          { label: "Plans", href: "/admin/plans", icon: LayoutGrid },
        ],
      },
      {
        key: "management",
        label: "Management",
        items: [
          { label: "Accounts", href: "/admin/accounts", icon: Building2 },
          { label: "Roles & Permissions", href: "/admin/roles", icon: Shield },
        ],
      },
      {
        key: "finance",
        label: "Finance",
        items: [
          { label: "Currencies", href: "/admin/currencies", icon: Coins },
          { label: "Payment Gateways", href: "/admin/gateways", icon: Wallet },
          { label: "Credit Packages", href: "/admin/credit-packages", icon: Package },
        ],
      },
      {
        key: "platform",
        label: "Platform",
        items: [
          { label: "Admins", href: "/admin/admins", icon: ShieldCheck },
          { label: "Templates", href: "/admin/templates", icon: FileText },
          { label: "Languages", href: "/admin/languages", icon: Languages },
          { label: "Settings", href: "/admin/settings", icon: Settings },
        ],
      },
      {
        key: "monitoring",
        label: "Logs & Monitor",
        items: [
          { label: "Tracking Logs", href: "/admin/logs/tracking", icon: Send },
          { label: "Blacklist", href: "/admin/logs/blacklist", icon: Ban },
          { label: "Notifications", href: "/admin/logs/notifications", icon: Bell },
          { label: "API Docs", href: "/admin/logs/api-docs", icon: BookOpen },
        ],
      },
      {
        key: "account",
        label: "Account",
        items: [
          { label: "Profile", href: "/admin/profile", icon: User },
        ],
      },
    ];
  }
  return [
    {
      key: "main",
      label: "",
      items: [
        { label: "Dashboard", href: "/app", icon: Home },
        { label: "Organizations", href: "/app/organizations", icon: Building2 },
        { label: "Members", href: "/app/members", icon: Users },
        { label: "Notifications", href: "/app/notifications", icon: Bell },
        { label: "Settings", href: "/app/settings", icon: Settings },
      ],
    },
  ];
}

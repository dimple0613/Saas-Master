"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Home, Users, CreditCard, Settings, Globe, Activity, User, ArrowRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
}

const ADMIN_ITEMS: SearchItem[] = [
  { label: "Dashboard", href: "/admin", icon: Home, keywords: ["dashboard", "home", "overview", "main"] },
  { label: "Users", href: "/admin/users", icon: Users, keywords: ["users", "members", "people", "accounts"] },
  { label: "Accounts", href: "/admin/accounts", icon: CreditCard, keywords: ["accounts", "admin", "tenants", "subscriptions"] },
  { label: "Plans", href: "/admin/plans", icon: CreditCard, keywords: ["plans", "subscriptions", "pricing", "billing"] },
  { label: "Profile", href: "/admin/profile", icon: User, keywords: ["profile", "account", "personal", "me"] },
];

const TENANT_ITEMS: SearchItem[] = [
  { label: "Dashboard", href: "/app", icon: Home, keywords: ["dashboard", "home", "overview", "main"] },
  { label: "Organizations", href: "/app/organizations", icon: Globe, keywords: ["organizations", "orgs", "teams", "groups"] },
  { label: "Members", href: "/app/members", icon: Users, keywords: ["members", "people", "invites"] },
  { label: "Settings", href: "/app/settings", icon: Settings, keywords: ["settings", "configuration", "preferences", "options"] },
  { label: "Notifications", href: "/app/notifications", icon: Activity, keywords: ["notifications", "alerts", "activity", "logs"] },
  { label: "Profile", href: "/app/profile", icon: User, keywords: ["profile", "account", "personal", "me"] },
];

interface CommandPaletteProps {
  variant: "admin" | "tenant";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ variant, open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const SEARCH_ITEMS = variant === "admin" ? ADMIN_ITEMS : TENANT_ITEMS;

  const filtered = useMemo(() => {
    if (!query.trim()) return SEARCH_ITEMS;
    const q = query.toLowerCase();
    return SEARCH_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.keywords.some((kw) => kw.includes(q))
    );
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const scrollToItem = useCallback((index: number) => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[index] as HTMLElement;
    if (item) {
      item.scrollIntoView({ block: "nearest" });
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => {
            const next = prev < filtered.length - 1 ? prev + 1 : 0;
            scrollToItem(next);
            return next;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => {
            const next = prev > 0 ? prev - 1 : filtered.length - 1;
            scrollToItem(next);
            return next;
          });
          break;
        case "Enter":
          e.preventDefault();
          if (filtered[activeIndex]) {
            router.push(filtered[activeIndex].href);
            onOpenChange(false);
          }
          break;
        case "Escape":
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [filtered, activeIndex, router, onOpenChange, scrollToItem]
  );

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        onOpenChange(false);
      }
    }
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [open, onOpenChange]);

  function highlightMatch(text: string, q: string) {
    if (!q.trim()) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-semibold text-foreground">{text.slice(idx, idx + q.length)}</span>
        {text.slice(idx + q.length)}
      </>
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-start justify-center pt-[15vh] pointer-events-none">
        <div
          className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl animate-in fade-in-0 zoom-in-95 pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search..."
              className="h-8 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div ref={listRef} className="max-h-[300px] overflow-y-auto p-1" role="listbox">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            ) : (
              <>
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  Navigation
                </div>
                {filtered.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      role="option"
                      aria-selected={index === activeIndex}
                      onClick={() => {
                        router.push(item.href);
                        onOpenChange(false);
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-1 text-sm transition-colors ${
                        index === activeIndex
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground hover:bg-accent/50"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 text-left">
                        {highlightMatch(item.label, query)}
                      </span>
                      <ArrowRight className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-opacity ${
                        index === activeIndex ? "opacity-100" : "opacity-0"
                      }`} />
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

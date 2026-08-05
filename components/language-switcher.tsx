"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useLanguage, LANGUAGES, type Language } from "@/lib/language-context";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const idx = LANGUAGES.findIndex((l) => l.code === language.code && l.label === language.label);
    if (idx !== -1) setActiveIndex(idx);
  }, [language]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const scrollToItem = useCallback((index: number) => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[index] as HTMLElement;
    if (item) item.scrollIntoView({ block: "nearest" });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => {
            const next = prev < LANGUAGES.length - 1 ? prev + 1 : 0;
            scrollToItem(next);
            return next;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => {
            const next = prev > 0 ? prev - 1 : LANGUAGES.length - 1;
            scrollToItem(next);
            return next;
          });
          break;
        case "Enter":
          e.preventDefault();
          setLanguage(LANGUAGES[activeIndex]);
          setOpen(false);
          triggerRef.current?.focus();
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
          break;
      }
    },
    [activeIndex, setLanguage, scrollToItem]
  );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:bg-background"
        aria-label="Select language"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="text-xs font-semibold text-foreground">{language.code}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-card shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Languages</span>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div
            ref={listRef}
            className="max-h-[320px] overflow-y-auto p-1"
            role="listbox"
            aria-label="Languages"
            onKeyDown={handleKeyDown}
          >
            {LANGUAGES.map((lang, index) => {
              const isSelected = lang.code === language.code && lang.label === language.label;
              const isActive = index === activeIndex;
              return (
                <button
                  key={`${lang.code}-${lang.label}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setLanguage(lang);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-1 text-sm transition-colors ${
                    isActive ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50"
                  }`}
                >
                  <span className="inline-flex h-6 min-w-[2rem] items-center justify-center rounded-md bg-muted px-1.5 font-mono text-xs font-semibold text-muted-foreground">
                    {lang.code}
                  </span>
                  <span className="flex-1 text-left">{lang.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

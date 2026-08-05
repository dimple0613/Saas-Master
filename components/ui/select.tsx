"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  useContext,
  memo,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface SelectCtx {
  open: boolean;
  toggle: () => void;
  selectItem: (v: string | number) => void;
  value: string | number;
  disabled: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  panelRef: React.RefObject<HTMLDivElement | null>;
}

const SelectCtx = createContext<SelectCtx | null>(null);

function useSelect() {
  const ctx = useContext(SelectCtx);
  if (!ctx) throw new Error("Select components must be used within <Select>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Select Root                                                        */
/* ------------------------------------------------------------------ */

interface SelectRootProps {
  value: string | number;
  onValueChange: (value: string | number) => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

function SelectRoot({
  value,
  onValueChange,
  disabled = false,
  children,
  className,
}: SelectRootProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: PointerEvent) {
      const target = e.target as Node;
      const inTrigger = triggerRef.current?.contains(target);
      const inPanel = panelRef.current?.contains(target);
      if (!inTrigger && !inPanel) setOpen(false);
    }
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const toggle = useCallback(() => {
    if (!disabled) setOpen((o) => !o);
  }, [disabled]);

  const selectItem = useCallback(
    (v: string | number) => {
      onValueChange(v);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [onValueChange]
  );

  return (
    <SelectCtx.Provider value={{ open, toggle, selectItem, value, disabled, triggerRef, panelRef }}>
      <div className={cn("relative w-full", className)}>
        {children}
      </div>
    </SelectCtx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Trigger                                                            */
/* ------------------------------------------------------------------ */

const SelectTrigger = memo(function SelectTrigger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { open, toggle, disabled, triggerRef } = useSelect();

  return (
    <button
      ref={triggerRef}
      type="button"
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
      disabled={disabled}
      onClick={toggle}
      className={cn(
        "inline-flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-border bg-background px-2 py-1 text-sm font-medium text-foreground shadow-sm transition-all duration-150",
        "hover:bg-accent hover:border-border/80",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        open && "border-ring ring-2 ring-ring/20",
        className
      )}
    >
      <span className="truncate min-w-0">{children}</span>
      <ChevronDown
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
          open && "rotate-180"
        )}
      />
    </button>
  );
});

/* ------------------------------------------------------------------ */
/*  Content — portaled to document.body                               */
/* ------------------------------------------------------------------ */

function SelectContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { open, triggerRef, panelRef } = useSelect();
  const [pos, setPos] = useState<{ top: number; left: number; width: number; height: number; openAbove: boolean } | null>(null);

  useEffect(() => {
    if (!open) { setPos(null); return; }

    function measure() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const ITEM_HEIGHT = 28;
      const MAX_ITEMS = 5;
      const dropdownHeight = ITEM_HEIGHT * MAX_ITEMS + 8;
      const openAbove = spaceBelow < dropdownHeight && r.top > dropdownHeight;
      setPos({ top: r.top, left: r.left, width: r.width, height: r.height, openAbove });
    }

    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, triggerRef]);

  if (!open || !pos) return null;

  const top = pos.openAbove
    ? pos.top - 4
    : pos.top + pos.height + 4;

  return createPortal(
    <div
      ref={panelRef}
      role="listbox"
      className={cn(
        "overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover py-1 shadow-lg",
        className
      )}
      style={{
        position: "fixed",
        top: pos.openAbove ? undefined : top,
        bottom: pos.openAbove ? window.innerHeight - top : undefined,
        left: pos.left,
        minWidth: pos.width,
        width: "max-content",
        maxHeight: 250,
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/*  Item                                                               */
/* ------------------------------------------------------------------ */

function SelectItem({
  value,
  children,
  className,
}: {
  value: string | number;
  children: ReactNode;
  className?: string;
}) {
  const { value: selected, selectItem } = useSelect();
  const isSelected = selected === value;

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={() => selectItem(value)}
      className={cn(
        "relative flex h-7 cursor-pointer items-center px-1.5 py-1 text-sm font-medium text-foreground transition-colors duration-150 rounded-lg mx-1",
        "hover:bg-accent",
        isSelected && "bg-accent",
        className
      )}
    >
      <span className="flex w-5 shrink-0 items-center justify-center">
        {isSelected && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
      <span className="truncate pl-1">{children}</span>
    </div>
  );
}

export { SelectRoot as Select, SelectTrigger, SelectContent, SelectItem };

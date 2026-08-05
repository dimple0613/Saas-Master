"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Check, Palette, X } from "lucide-react";
import { useTheme, COLOR_SCHEMES } from "@/lib/theme-context";

export function ThemeSelector() {
  const { colorScheme, setColorScheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !dropdownRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdown = dropdownRef.current;
    const viewportWidth = window.innerWidth;
    const dropdownWidth = dropdown.offsetWidth;

    let left = rect.right - dropdownWidth;
    if (left < 8) left = 8;
    if (left + dropdownWidth > viewportWidth - 8) left = viewportWidth - dropdownWidth - 8;

    let top = rect.bottom + 8;
    const dropdownHeight = dropdown.offsetHeight;
    if (top + dropdownHeight > window.innerHeight - 8) {
      top = rect.top - dropdownHeight - 8;
    }

    dropdown.style.left = `${left}px`;
    dropdown.style.top = `${top}px`;
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      requestAnimationFrame(updatePosition);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, updatePosition]);

  function handleCardHover(schemeId: string, e: React.MouseEvent) {
    clearTimeout(tooltipTimeout.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
    setHoveredId(schemeId);
  }

  function handleCardLeave() {
    tooltipTimeout.current = setTimeout(() => setHoveredId(null), 100);
  }

  const hoveredScheme = COLOR_SCHEMES.find((s) => s.id === hoveredId);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="rounded-md p-1.5 hover:bg-accent"
        aria-label="Select theme"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Palette className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={dropdownRef}
            className="fixed z-50 w-[280px] rounded-xl border border-border bg-card shadow-xl animate-in fade-in-0 zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Theme selector"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Color Scheme</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Theme Grid */}
            <div className="grid grid-cols-2 gap-2.5 px-3 pb-3">
              {COLOR_SCHEMES.map((scheme) => {
                const isSelected = colorScheme === scheme.id;
                return (
                  <button
                    key={scheme.id}
                    onClick={() => setColorScheme(scheme.id)}
                    onMouseEnter={(e) => handleCardHover(scheme.id, e)}
                    onMouseLeave={handleCardLeave}
                    className={`group relative flex flex-col rounded-xl border-2 p-2.5 text-left transition-all hover:shadow-md ${
                      isSelected
                        ? "border-primary shadow-sm"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    {/* Checkmark */}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </div>
                    )}

                    {/* Color Shade Strips */}
                    <div className="flex h-8 w-full overflow-hidden rounded-md">
                      {scheme.colors.map((color, i) => (
                        <div
                          key={i}
                          className="h-full flex-1 first:rounded-l-md last:rounded-r-md"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tooltip */}
          {hoveredScheme && (
            <div
              className="fixed z-[60] pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150"
              style={{
                left: tooltipPos.x,
                top: tooltipPos.y - 8,
                transform: "translate(-50%, -100%)",
              }}
            >
              <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
                <p className="whitespace-nowrap text-sm font-medium text-foreground">{hoveredScheme.label}</p>
                <p className="whitespace-nowrap text-xs text-muted-foreground">{hoveredScheme.description}</p>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

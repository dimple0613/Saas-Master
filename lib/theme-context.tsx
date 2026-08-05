"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";

type Theme = "light" | "dark";

export interface ColorScheme {
  id: string;
  label: string;
  description: string;
  colors: string[];
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: "teal",
    label: "Teal",
    description: "Classic and professional",
    colors: ["#0d9488", "#14b8a6", "#5eead4", "#99f6e4"],
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Cool and trustworthy",
    colors: ["#1e40af", "#3b82f6", "#60a5fa", "#93c5fd"],
  },
  {
    id: "forest",
    label: "Forest",
    description: "Fresh and natural",
    colors: ["#15803d", "#22c55e", "#4ade80", "#86efac"],
  },
  {
    id: "amber",
    label: "Amber",
    description: "Warm and grounded",
    colors: ["#b45309", "#f59e0b", "#fbbf24", "#fde68a"],
  },
  {
    id: "rose",
    label: "Rose",
    description: "Bold and creative",
    colors: ["#be123c", "#f43f5e", "#fb7185", "#fda4af"],
  },
  {
    id: "neutral",
    label: "Neutral",
    description: "Clean and understated",
    colors: ["#525252", "#a3a3a3", "#d4d4d4", "#f5f5f5"],
  },
];

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  colorScheme: string;
  setColorScheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
  colorScheme: "teal",
  setColorScheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyColorScheme(schemeId: string) {
  document.documentElement.setAttribute("data-color-scheme", schemeId);
}

export function ManualThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [colorScheme, setColorSchemeState] = useState<string>("teal");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = stored || (prefersDark ? "dark" : "light");
    setThemeState(initialTheme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(initialTheme);

    const storedScheme = localStorage.getItem("color-scheme") || "teal";
    setColorSchemeState(storedScheme);
    applyColorScheme(storedScheme);

    setMounted(true);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("theme", t);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(t);
  }, []);

  const setColorScheme = useCallback((id: string) => {
    setColorSchemeState(id);
    localStorage.setItem("color-scheme", id);
    applyColorScheme(id);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colorScheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

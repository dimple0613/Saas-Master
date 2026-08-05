"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface Language {
  code: string;
  label: string;
}

export const LANGUAGES: Language[] = [
  { code: "EN", label: "English" },
  { code: "CS", label: "Čeština" },
  { code: "FR", label: "Français" },
  { code: "DE", label: "German" },
  { code: "IT", label: "Italian" },
  { code: "NL", label: "Nederlands" },
  { code: "PL", label: "Polski" },
  { code: "PT", label: "Português (Brasil)" },
  { code: "PT", label: "Portuguese" },
  { code: "ES", label: "Spanish" },
  { code: "VI", label: "Tiếng Việt" },
  { code: "AR", label: "Tunisia" },
  { code: "TR", label: "Türkçe" },
  { code: "RU", label: "Русский" },
  { code: "UK", label: "Українська" },
];

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: LANGUAGES[0],
  setLanguage: () => {},
});

const STORAGE_KEY = "app-language";

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return LANGUAGES[0];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Language;
      if (LANGUAGES.some((l) => l.code === parsed.code && l.label === parsed.label)) {
        return parsed;
      }
    }
  } catch {}
  return LANGUAGES[0];
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(LANGUAGES[0]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLanguageState(getStoredLanguage());
    setMounted(true);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lang));
    } catch {}
  }, []);

  if (!mounted) {
    return <LanguageContext.Provider value={{ language: LANGUAGES[0], setLanguage: () => {} }}>{children}</LanguageContext.Provider>;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

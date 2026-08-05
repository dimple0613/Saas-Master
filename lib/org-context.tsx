"use client";

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";

interface OrgContextValue {
  orgId: string | null;
  orgName: string;
  setOrg: (id: string, name: string) => void;
}

const OrgContext = createContext<OrgContextValue>({
  orgId: null,
  orgName: "",
  setOrg: () => {},
});

export function OrgProvider({ children }: { children: ReactNode }) {
  const [orgId, setOrgId] = useState<string | null>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("selectedOrgId");
    return null;
  });
  const [orgName, setOrgName] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("selectedOrgName") || "";
    return "";
  });

  const setOrg = useCallback((id: string, name: string) => {
    setOrgId(id);
    setOrgName(name);
    localStorage.setItem("selectedOrgId", id);
    localStorage.setItem("selectedOrgName", name);
  }, []);

  const value = useMemo(() => ({ orgId, orgName, setOrg }), [orgId, orgName, setOrg]);

  return (
    <OrgContext.Provider value={value}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}

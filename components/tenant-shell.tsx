import { Shell } from "./shell";

export function TenantShell({ children }: { children: React.ReactNode }) {
  return <Shell variant="tenant">{children}</Shell>;
}

import { Shell } from "./shell";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return <Shell variant="admin">{children}</Shell>;
}

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = session.user?.role || "user";
  redirect(role === "superadmin" || role === "admin" ? "/admin" : "/app");
}

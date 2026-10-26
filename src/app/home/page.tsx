import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function HomeRedirectPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin");
  redirect("/control");
}

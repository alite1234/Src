import { redirect } from "next/navigation";

import { auth } from "@/auth";
import type { Role } from "@/lib/types";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role,
  };
}

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/home");
  return user;
}

export async function getApiUser(roles?: Role[]): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (roles && !roles.includes(user.role)) return null;
  return user;
}

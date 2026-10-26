"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size={compact ? "icon" : "sm"}
      title="Sign out"
      onClick={() => void signOut({ callbackUrl: "/login" })}
    >
      <LogOut className="h-4 w-4" />
      {compact ? <span className="sr-only">Sign out</span> : "Sign out"}
    </Button>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function LogoutButton({ redirectTo = "/role" }: { redirectTo?: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <Button
      variant="outline"
      fullWidth
      loading={loading}
      onClick={async () => {
        setLoading(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace(redirectTo);
        router.refresh();
      }}
    >
      <LogOut className="h-4 w-4" /> Log out
    </Button>
  );
}

"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  role: "BUYER" | "SELLER" | "ADMIN";
  isActive: boolean;
  store: { name: string; status: string } | null;
}

const ROLES = ["ALL", "BUYER", "SELLER", "ADMIN"] as const;

export default function AdminUsersPage() {
  const [role, setRole] = useState<(typeof ROLES)[number]>("ALL");
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setUsers(null);
    const res = await fetch(`/api/admin/users${role !== "ALL" ? `?role=${role}` : ""}`, { cache: "no-store" });
    const data = await res.json();
    setUsers(data.users ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  async function toggleActive(u: UserRow) {
    setBusyId(u.id);
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    setBusyId(null);
    if (!res.ok) {
      toast.error((await res.json()).error || "Could not update user");
      return;
    }
    toast.success(u.isActive ? "User deactivated" : "User activated");
    load();
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-extrabold text-zinc-900">Users</h1>

      <div className="mb-4 flex gap-2">
        {ROLES.map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
              role === r ? "border-brand-600 bg-brand-600 text-white" : "border-zinc-200 text-zinc-600"
            )}
          >
            {r.charAt(0) + r.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {!users && (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {users && users.length === 0 && <EmptyState icon={Users} title="No users found" />}

      {users && users.length > 0 && (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3.5">
              <div>
                <p className="text-sm font-semibold text-zinc-800">{u.name ?? "—"}</p>
                <p className="text-xs text-zinc-500">
                  {u.phone} {u.email ? `· ${u.email}` : ""}
                </p>
                {u.store && <p className="text-xs text-zinc-400">{u.store.name} · {u.store.status}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="brand">{u.role}</Badge>
                {u.role !== "ADMIN" && (
                  <button
                    disabled={busyId === u.id}
                    onClick={() => toggleActive(u)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-bold",
                      u.isActive ? "bg-success-50 text-success-600" : "bg-danger-50 text-danger-600"
                    )}
                  >
                    {u.isActive ? "Active" : "Inactive"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

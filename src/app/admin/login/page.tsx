"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid credentials");
      toast.success("Welcome back");
      router.replace("/admin/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col items-center justify-center bg-white px-6">
      <Logo markSize={44} />
      <div className="mt-4 flex items-center gap-2 text-zinc-500">
        <ShieldCheck className="h-4 w-4" />
        <span className="text-sm font-medium">Admin console</span>
      </div>

      <form onSubmit={submit} className="mt-8 w-full space-y-4">
        <Input label="Admin phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" size="lg" fullWidth loading={loading}>
          Sign in
        </Button>
      </form>
    </main>
  );
}

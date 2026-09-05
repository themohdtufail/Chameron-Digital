"use client";

import { FormEvent, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Role = "BUYER" | "SELLER";

interface Me {
  id: string;
  role: Role;
  name: string | null;
  phone: string;
  hasStore: boolean;
  storeStatus: string | null;
}

export function AuthOtpForm({
  role,
  onSuccess,
  tagline,
}: {
  role: Role;
  onSuccess: (user: Me) => void;
  tagline: string;
}) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const fullPhone = phone.trim().startsWith("+") ? phone.trim() : `+91${phone.trim()}`;

  async function requestOtp(e: FormEvent) {
    e.preventDefault();
    if (phone.trim().length < 10) {
      toast.error("Enter a valid mobile number");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send OTP");
      setIsNewUser(Boolean(data.isNewUser));
      setDevCode(data.devCode ?? null);
      setStep("otp");
      toast.success(data.devCode ? `Dev OTP: ${data.devCode}` : "OTP sent");
      setTimeout(() => codeInputRef.current?.focus(), 50);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    if (isNewUser && name.trim().length < 2) {
      toast.error("Please enter your name");
      return;
    }
    if (code.trim().length < 4) {
      toast.error("Enter the code you received");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, code, role, name: name || undefined, email: email || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      toast.success(`Welcome${data.user.name ? `, ${data.user.name}` : ""}!`);
      onSuccess(data.user);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (step === "phone") {
    return (
      <form onSubmit={requestOtp} className="flex flex-col gap-4 animate-fade-in-up">
        <Input
          label="Mobile number"
          type="tel"
          inputMode="numeric"
          placeholder="98765 43210"
          prefix="+91"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ""))}
          autoFocus
        />
        <p className="text-xs text-zinc-500">{tagline}</p>
        <Button type="submit" size="lg" loading={loading} fullWidth>
          Send OTP
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={verifyOtp} className="flex flex-col gap-4 animate-fade-in-up">
      <button
        type="button"
        onClick={() => setStep("phone")}
        className="flex items-center gap-1 text-sm font-medium text-zinc-500"
      >
        <ArrowLeft className="h-4 w-4" /> Change number
      </button>

      {isNewUser && (
        <>
          <Input label="Your name" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="Email (optional)"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </>
      )}

      <Input
        ref={codeInputRef}
        label={`Enter the code sent to ${fullPhone}`}
        inputMode="numeric"
        placeholder="6-digit code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
        prefix={<ShieldCheck className="h-4 w-4" />}
      />
      {devCode && (
        <p className="rounded-lg bg-accent-50 px-3 py-2 text-xs font-medium text-accent-700">
          Demo mode — your code is <b>{devCode}</b>
        </p>
      )}
      <Button type="submit" size="lg" loading={loading} fullWidth>
        Verify &amp; continue
      </Button>
    </form>
  );
}

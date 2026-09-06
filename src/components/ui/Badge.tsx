import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "danger" | "brand" | "neutral" | "accent";

const toneClasses: Record<Tone, string> = {
  success: "bg-success-50 text-success-600",
  danger: "bg-danger-50 text-danger-600",
  brand: "bg-brand-50 text-brand-700",
  neutral: "bg-zinc-100 text-zinc-600",
  accent: "bg-accent-50 text-accent-600",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}

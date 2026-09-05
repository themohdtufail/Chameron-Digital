import { Check, Clock, ChefHat, PackageCheck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrderStatusValue = "PENDING" | "CONFIRMED" | "PREPARING" | "COMPLETED" | "CANCELLED" | "REJECTED";

const STEPS: { key: OrderStatusValue; label: string; icon: typeof Clock }[] = [
  { key: "PENDING", label: "Pending", icon: Clock },
  { key: "CONFIRMED", label: "Confirmed", icon: Check },
  { key: "PREPARING", label: "Preparing", icon: ChefHat },
  { key: "COMPLETED", label: "Completed", icon: PackageCheck },
];

const TONE: Record<OrderStatusValue, string> = {
  PENDING: "bg-accent-50 text-accent-600",
  CONFIRMED: "bg-brand-50 text-brand-600",
  PREPARING: "bg-brand-50 text-brand-600",
  COMPLETED: "bg-success-50 text-success-600",
  CANCELLED: "bg-zinc-100 text-zinc-500",
  REJECTED: "bg-danger-50 text-danger-600",
};

export function OrderStatusBadge({ status }: { status: OrderStatusValue }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide", TONE[status])}>
      {status}
    </span>
  );
}

export function OrderStatusTimeline({ status }: { status: OrderStatusValue }) {
  if (status === "CANCELLED" || status === "REJECTED") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-danger-50 p-4">
        <XCircle className="h-6 w-6 text-danger-500" />
        <div>
          <p className="text-sm font-bold text-danger-700">
            Order {status === "CANCELLED" ? "cancelled" : "rejected"}
          </p>
          <p className="text-xs text-danger-500">
            {status === "CANCELLED" ? "You cancelled this order." : "The seller was unable to accept this order."}
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center">
      {STEPS.map((step, idx) => {
        const done = idx <= currentIndex;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex flex-1 flex-col items-center last:flex-none">
            <div className="flex w-full items-center">
              {idx > 0 && <div className={cn("h-0.5 flex-1", idx <= currentIndex ? "bg-brand-500" : "bg-zinc-200")} />}
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  done ? "bg-brand-600 text-white" : "bg-zinc-100 text-zinc-400"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn("h-0.5 flex-1", idx < currentIndex ? "bg-brand-500" : "bg-zinc-200")} />
              )}
            </div>
            <span className={cn("mt-1.5 text-[10px] font-semibold", done ? "text-brand-700" : "text-zinc-400")}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

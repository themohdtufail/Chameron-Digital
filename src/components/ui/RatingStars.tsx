import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({
  rating,
  count,
  size = "sm",
  className,
}: {
  rating: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold text-zinc-700", className)}>
      <Star className={cn(iconSize, "fill-accent-400 text-accent-400")} />
      {rating > 0 ? rating.toFixed(1) : "New"}
      {typeof count === "number" && count > 0 && (
        <span className="font-normal text-zinc-400">({count})</span>
      )}
    </span>
  );
}

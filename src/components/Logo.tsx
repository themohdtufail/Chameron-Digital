import { cn } from "@/lib/utils";

export function LogoMark({ className, size = 56 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="cd-grad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818cf8" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect width="56" height="56" rx="16" fill="url(#cd-grad)" />
      <path
        d="M37 20.5c-1.8-2.4-4.6-4-8-4-5.8 0-10.5 4.7-10.5 10.5S23.2 37.5 29 37.5c3.4 0 6.2-1.6 8-4"
        stroke="white"
        strokeWidth="3.4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="29" cy="27" r="2.4" fill="white" />
    </svg>
  );
}

export function Logo({ className, markSize = 40 }: { className?: string; markSize?: number }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={markSize} />
      <div className="leading-none">
        <p className="text-lg font-extrabold tracking-tight text-zinc-900">
          Chameron <span className="text-brand-600">Digital</span>
        </p>
      </div>
    </div>
  );
}

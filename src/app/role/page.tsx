import Link from "next/link";
import { ShoppingBag, Store, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function RoleSelectionPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-white px-6 pb-10 pt-10">
      <Logo className="mx-auto" markSize={44} />

      <div className="mt-10 animate-fade-in-up text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">
          How would you like to continue?
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Pick the experience that fits you — you can always switch later.
        </p>
      </div>

      <div className="mt-8 flex flex-1 flex-col justify-center gap-5">
        <RoleCard
          href="/buyer/login"
          icon={<ShoppingBag className="h-7 w-7 text-brand-600" />}
          iconBg="bg-brand-50"
          emoji="🛒"
          title="Buyer"
          description="Discover and shop from trusted local stores"
          style={{ animationDelay: "80ms" }}
        />
        <RoleCard
          href="/seller/login"
          icon={<Store className="h-7 w-7 text-accent-600" />}
          iconBg="bg-accent-50"
          emoji="🏪"
          title="Seller"
          description="Create your digital store and grow online"
          style={{ animationDelay: "180ms" }}
        />
      </div>

      <p className="mt-6 text-center text-xs text-zinc-400">
        By continuing, you agree to Chameron Digital&apos;s Terms &amp; Privacy Policy.
      </p>
    </main>
  );
}

function RoleCard({
  href,
  icon,
  iconBg,
  emoji,
  title,
  description,
  style,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  emoji: string;
  title: string;
  description: string;
  style?: React.CSSProperties;
}) {
  return (
    <Link
      href={href}
      style={style}
      className="group flex animate-fade-in-up items-center gap-4 rounded-2xl border border-zinc-100 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated active:scale-[0.98]"
    >
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${iconBg} transition-transform group-hover:scale-105`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-zinc-900">
          {emoji} {title}
        </p>
        <p className="mt-0.5 text-sm leading-snug text-zinc-500">{description}</p>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-500" />
    </Link>
  );
}

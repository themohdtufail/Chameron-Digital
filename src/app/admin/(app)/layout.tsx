import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AdminNavTabs } from "@/components/admin/AdminNavTabs";
import { LogoutButton } from "@/components/LogoutButton";

export default function AdminAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/admin/dashboard">
            <Logo markSize={32} />
          </Link>
          <div className="w-32">
            <LogoutButton redirectTo="/admin/login" />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
        <AdminNavTabs />
      </div>
      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6">{children}</main>
    </div>
  );
}

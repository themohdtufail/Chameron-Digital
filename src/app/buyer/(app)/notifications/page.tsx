import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NotificationList } from "@/components/NotificationList";

export const dynamic = "force-dynamic";

export default function BuyerNotificationsPage() {
  return (
    <div className="animate-fade-in pb-10">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-100 bg-white/95 px-4 py-4 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-2xl items-center gap-3 lg:px-8 lg:pt-8">
          <Link href="/buyer/home" className="lg:hidden">
            <ArrowLeft className="h-5 w-5 text-zinc-700" />
          </Link>
          <h1 className="text-lg font-extrabold text-zinc-900 lg:text-2xl">Notifications</h1>
        </div>
      </div>
      <div className="mx-auto max-w-2xl lg:px-8">
        <NotificationList orderHrefPrefix="/buyer/order" productRequestHref="/buyer/requests" />
      </div>
    </div>
  );
}

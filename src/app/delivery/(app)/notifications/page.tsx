import { NotificationList } from "@/components/NotificationList";

export const dynamic = "force-dynamic";

export default function DeliveryNotificationsPage() {
  return (
    <div className="animate-fade-in px-4 py-5 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-xl font-extrabold text-zinc-900 lg:text-2xl">Notifications</h1>
        <div className="rounded-2xl border border-zinc-100 bg-white shadow-card">
          <NotificationList orderHrefPrefix="/delivery/deliveries" />
        </div>
      </div>
    </div>
  );
}

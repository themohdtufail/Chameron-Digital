import Link from "next/link";
import {
  ShoppingBag,
  IndianRupee,
  Package,
  Users,
  ArrowRight,
  AlertTriangle,
  LayoutGrid,
  Boxes,
  BarChart3,
  Inbox,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { OrderStatusBadge, type OrderStatusValue } from "@/components/OrderStatus";
import { formatCurrency } from "@/lib/utils";
import { StoreOpenToggle } from "@/components/seller/StoreOpenToggle";

export const dynamic = "force-dynamic";

const QUICK_LINKS = [
  { href: "/seller/categories", label: "Categories", icon: LayoutGrid },
  { href: "/seller/inventory", label: "Inventory", icon: Boxes },
  { href: "/seller/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/seller/requests", label: "Requests", icon: Inbox },
];

export default async function SellerDashboardPage() {
  const user = await getCurrentUser();
  const store = await prisma.store.findUnique({ where: { ownerId: user!.id } });
  if (!store) return null;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [todaysOrders, salesAgg, productCount, distinctCustomers, recentOrders, trackedStock] = await Promise.all([
    prisma.order.count({ where: { storeId: store.id, createdAt: { gte: startOfDay } } }),
    prisma.order.aggregate({
      where: { storeId: store.id, status: { in: ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"] } },
      _sum: { total: true },
    }),
    prisma.product.count({ where: { storeId: store.id } }),
    prisma.order.findMany({ where: { storeId: store.id }, distinct: ["buyerId"], select: { buyerId: true } }),
    prisma.order.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { items: true },
    }),
    prisma.product.findMany({
      where: { storeId: store.id, trackInventory: true },
      select: { stockQuantity: true, lowStockThreshold: true },
    }),
  ]);

  const lowStockCount = trackedStock.filter((r) => r.stockQuantity > 0 && r.stockQuantity <= r.lowStockThreshold).length;

  const cards = [
    { label: "Today's Orders", value: todaysOrders, icon: ShoppingBag, tone: "bg-brand-50 text-brand-600" },
    { label: "Total Sales", value: formatCurrency(salesAgg._sum.total ?? 0), icon: IndianRupee, tone: "bg-success-50 text-success-600" },
    { label: "Products", value: productCount, icon: Package, tone: "bg-accent-50 text-accent-600" },
    { label: "Customers", value: distinctCustomers.length, icon: Users, tone: "bg-brand-50 text-brand-600" },
  ];

  return (
    <div className="animate-fade-in px-4 py-5 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">Welcome back,</p>
            <h1 className="text-xl font-extrabold text-zinc-900 lg:text-2xl">{store.name}</h1>
          </div>
          <StoreOpenToggle isManuallyClosed={store.isManuallyClosed} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card lg:p-5">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${c.tone}`}>
                <c.icon className="h-[18px] w-[18px]" />
              </div>
              <p className="mt-3 text-lg font-extrabold text-zinc-900 lg:text-2xl">{c.value}</p>
              <p className="text-xs text-zinc-500">{c.label}</p>
            </div>
          ))}
        </div>

        {lowStockCount > 0 && (
          <Link
            href="/seller/inventory?filter=low"
            className="mt-4 flex items-center gap-2 rounded-xl border border-accent-200 bg-accent-50 px-3.5 py-2.5 text-sm font-semibold text-accent-700"
          >
            <AlertTriangle className="h-4 w-4" /> {lowStockCount} product{lowStockCount > 1 ? "s are" : " is"} running low on stock
          </Link>
        )}

        <div className="mt-5 grid grid-cols-4 gap-2 lg:hidden">
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-zinc-100 bg-white py-3 text-center shadow-card"
            >
              <l.icon className="h-4 w-4 text-brand-600" />
              <span className="text-[10px] font-semibold text-zinc-700">{l.label}</span>
            </Link>
          ))}
        </div>

        <div className="mt-6 lg:mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 lg:text-base">Recent orders</h2>
            <Link href="/seller/orders" className="flex items-center gap-0.5 text-xs font-semibold text-brand-600">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-400">
              No orders yet. Share your store link to get your first sale!
            </p>
          ) : (
            <div className="grid gap-2 lg:grid-cols-2 lg:gap-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/seller/orders/${order.id}`}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white p-3 shadow-card"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{order.orderNumber}</p>
                    <p className="text-xs text-zinc-500">
                      {order.items.length} item{order.items.length > 1 ? "s" : ""} · {formatCurrency(order.total)}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status as OrderStatusValue} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

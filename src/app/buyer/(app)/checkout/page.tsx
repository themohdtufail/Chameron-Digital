"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, MapPin, Plus, Wallet, CreditCard, Check, Gift } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { cn, formatCurrency } from "@/lib/utils";

interface Address {
  id: string;
  label: string;
  fullName: string | null;
  phone: string | null;
  addressLine: string | null;
  landmark: string | null;
  area: string | null;
  city: string;
  state: string | null;
  pincode: string | null;
  deliveryInstructions: string | null;
}

const emptyAddressForm = {
  fullName: "",
  phone: "",
  addressLine: "",
  landmark: "",
  area: "",
  city: "",
  state: "",
  pincode: "",
  deliveryInstructions: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");
  const [cartTotal, setCartTotal] = useState<{ subtotal: number; deliveryFee: number; total: number } | null>(null);
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [useLoyalty, setUseLoyalty] = useState(false);

  const [newAddress, setNewAddress] = useState(emptyAddressForm);

  useEffect(() => {
    (async () => {
      const [meRes, locRes, cartRes, loyaltyRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/location"),
        fetch("/api/cart"),
        fetch("/api/loyalty"),
      ]);
      const me = await meRes.json();
      const loc = await locRes.json();
      const cart = await cartRes.json();
      const loyalty = await loyaltyRes.json();

      setAddresses(loc.locations ?? []);
      setSelectedAddressId(loc.locations?.[0]?.id ?? null);
      setCartTotal({ subtotal: cart.subtotal, deliveryFee: cart.deliveryFee, total: cart.total });
      setLoyaltyBalance(loyalty.pointsBalance ?? 0);
      if (!loc.locations?.length) {
        setNewAddress((s) => ({ ...s, fullName: me.user?.name ?? "", phone: me.user?.phone ?? "" }));
        setShowAddForm(true);
      }
      setLoading(false);
    })();
  }, []);

  async function saveNewAddress() {
    if (!newAddress.fullName.trim() || newAddress.phone.trim().length < 10) {
      toast.error("Enter the recipient's name and a valid phone number");
      return null;
    }
    if (!newAddress.addressLine.trim() || !newAddress.city.trim()) {
      toast.error("Address line and city are required");
      return null;
    }
    const res = await fetch("/api/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newAddress, label: "Delivery" }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Could not save address");
      return null;
    }
    const data = await res.json();
    setAddresses((prev) => [data.location, ...prev]);
    setSelectedAddressId(data.location.id);
    setShowAddForm(false);
    return data.location.id as string;
  }

  async function placeOrder() {
    let addressId = selectedAddressId;
    if (showAddForm || !addressId) {
      addressId = await saveNewAddress();
      if (!addressId) return;
    }

    const address = addresses.find((a) => a.id === addressId);

    setPlacing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId,
          customerName: address?.fullName || newAddress.fullName,
          customerPhone: address?.phone || newAddress.phone,
          notes: notes || undefined,
          paymentMethod,
          redeemPoints,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not place order");
      toast.success("Order placed!");
      router.replace(`/buyer/order/${data.order.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPlacing(false);
    }
  }

  if (loading) return <div className="p-6 text-center text-sm text-zinc-400">Loading checkout…</div>;

  const redeemPoints =
    useLoyalty && cartTotal ? Math.min(loyaltyBalance, Math.floor(cartTotal.subtotal)) : 0;
  const discount = redeemPoints;
  const finalTotal = cartTotal ? cartTotal.total - discount : 0;

  return (
    <div className="animate-fade-in pb-32 lg:pb-16">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-100 bg-white/95 px-4 py-4 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:pt-8 lg:backdrop-blur-none">
        <div className="page-container flex items-center gap-3 lg:px-8">
          <Link href="/buyer/cart">
            <ArrowLeft className="h-5 w-5 text-zinc-700" />
          </Link>
          <h1 className="text-lg font-extrabold text-zinc-900 lg:text-2xl">Checkout</h1>
        </div>
      </div>

      <div className="page-container lg:grid lg:grid-cols-3 lg:items-start lg:gap-8 lg:px-8 lg:py-6">
      <div className="space-y-6 px-4 py-5 lg:col-span-2 lg:px-0 lg:py-0">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900">Delivery address</h2>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1 text-xs font-semibold text-brand-600"
              >
                <Plus className="h-3.5 w-3.5" /> Add new
              </button>
            )}
          </div>

          {!showAddForm && (
            <div className="space-y-2">
              {addresses.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => setSelectedAddressId(addr.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition",
                    selectedAddressId === addr.id ? "border-brand-500 bg-brand-50" : "border-zinc-200 hover:bg-zinc-50"
                  )}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  <div className="flex-1 text-sm">
                    <p className="font-semibold text-zinc-900">
                      {addr.label}
                      {addr.fullName && <span className="font-normal text-zinc-500"> · {addr.fullName}</span>}
                    </p>
                    <p className="text-zinc-500">
                      {[addr.addressLine, addr.landmark, addr.area, addr.city, addr.state, addr.pincode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {addr.phone && <p className="text-zinc-400">{addr.phone}</p>}
                  </div>
                  {selectedAddressId === addr.id && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
                </button>
              ))}
            </div>
          )}

          {showAddForm && (
            <div className="space-y-3 rounded-xl border border-zinc-200 p-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Recipient name"
                  value={newAddress.fullName}
                  onChange={(e) => setNewAddress((s) => ({ ...s, fullName: e.target.value }))}
                />
                <Input
                  label="Phone number"
                  value={newAddress.phone}
                  onChange={(e) => setNewAddress((s) => ({ ...s, phone: e.target.value }))}
                />
              </div>
              <Input
                label="House / street / society"
                placeholder="House no, street, society"
                value={newAddress.addressLine}
                onChange={(e) => setNewAddress((s) => ({ ...s, addressLine: e.target.value }))}
              />
              <Input
                label="Landmark (optional)"
                value={newAddress.landmark}
                onChange={(e) => setNewAddress((s) => ({ ...s, landmark: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Area"
                  value={newAddress.area}
                  onChange={(e) => setNewAddress((s) => ({ ...s, area: e.target.value }))}
                />
                <Input
                  label="City"
                  value={newAddress.city}
                  onChange={(e) => setNewAddress((s) => ({ ...s, city: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="State"
                  value={newAddress.state}
                  onChange={(e) => setNewAddress((s) => ({ ...s, state: e.target.value }))}
                />
                <Input
                  label="Pincode"
                  value={newAddress.pincode}
                  onChange={(e) => setNewAddress((s) => ({ ...s, pincode: e.target.value }))}
                />
              </div>
              <Textarea
                label="Delivery instructions (optional)"
                rows={2}
                placeholder="Gate code, landmark, preferred time..."
                value={newAddress.deliveryInstructions}
                onChange={(e) => setNewAddress((s) => ({ ...s, deliveryInstructions: e.target.value }))}
              />
              {addresses.length > 0 && (
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-xs font-semibold text-zinc-500 underline"
                >
                  Use a saved address instead
                </button>
              )}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold text-zinc-900">Order notes (optional)</h2>
          <Textarea rows={2} placeholder="Delivery instructions..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold text-zinc-900">Payment method</h2>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("COD")}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                paymentMethod === "COD" ? "border-brand-500 bg-brand-50" : "border-zinc-200 hover:bg-zinc-50"
              )}
            >
              <Wallet className={cn("h-4 w-4", paymentMethod === "COD" ? "text-brand-600" : "text-zinc-400")} />
              <span className="flex-1 text-sm font-semibold text-zinc-900">Cash on Delivery</span>
              {paymentMethod === "COD" && <Check className="h-4 w-4 text-brand-600" />}
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("ONLINE")}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                paymentMethod === "ONLINE" ? "border-brand-500 bg-brand-50" : "border-zinc-200 hover:bg-zinc-50"
              )}
            >
              <CreditCard className={cn("h-4 w-4", paymentMethod === "ONLINE" ? "text-brand-600" : "text-zinc-400")} />
              <span className="flex-1 text-sm font-semibold text-zinc-900">Pay online</span>
              {paymentMethod === "ONLINE" ? (
                <Check className="h-4 w-4 text-brand-600" />
              ) : (
                <span className="text-[11px] font-semibold text-zinc-400">UPI / Card / Wallet</span>
              )}
            </button>
          </div>
        </section>

        {loyaltyBalance > 0 && (
          <section>
            <label className="flex items-center justify-between rounded-xl border border-zinc-200 p-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
                <Gift className="h-4 w-4 text-accent-500" />
                Use {loyaltyBalance} loyalty point{loyaltyBalance === 1 ? "" : "s"} (₹{loyaltyBalance} off)
              </span>
              <input
                type="checkbox"
                checked={useLoyalty}
                onChange={(e) => setUseLoyalty(e.target.checked)}
                className="h-5 w-5 accent-brand-600"
              />
            </label>
          </section>
        )}

        {cartTotal && (
          <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card lg:hidden">
            <Row label="Subtotal" value={formatCurrency(cartTotal.subtotal)} />
            <Row label="Delivery charge" value={cartTotal.deliveryFee ? formatCurrency(cartTotal.deliveryFee) : "Free"} />
            {discount > 0 && <Row label="Loyalty discount" value={`-${formatCurrency(discount)}`} />}
            <div className="my-1 border-t border-dashed border-zinc-200" />
            <Row label="Total" value={formatCurrency(finalTotal)} bold />
          </section>
        )}
      </div>

      {cartTotal && (
        <div className="hidden lg:sticky lg:top-8 lg:col-span-1 lg:block">
          <div className="space-y-2 rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
            <Row label="Subtotal" value={formatCurrency(cartTotal.subtotal)} />
            <Row label="Delivery charge" value={cartTotal.deliveryFee ? formatCurrency(cartTotal.deliveryFee) : "Free"} />
            {discount > 0 && <Row label="Loyalty discount" value={`-${formatCurrency(discount)}`} />}
            <div className="my-1 border-t border-dashed border-zinc-200" />
            <Row label="Total" value={formatCurrency(finalTotal)} bold />
            <Button size="lg" fullWidth loading={placing} onClick={placeOrder} className="mt-3">
              Place order
            </Button>
          </div>
        </div>
      )}
      </div>

      <div className="action-bar fixed inset-x-0 bottom-0 z-40 border-t border-zinc-100 p-4 lg:hidden">
        <Button size="lg" fullWidth loading={placing} onClick={placeOrder}>
          Place order
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className={bold ? "font-bold text-zinc-900" : "text-zinc-500"}>{label}</span>
      <span className={bold ? "font-extrabold text-zinc-900" : "font-medium text-zinc-700"}>{value}</span>
    </div>
  );
}

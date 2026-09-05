"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, MapPin, Plus, Wallet, CreditCard, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { cn, formatCurrency } from "@/lib/utils";

interface Address {
  id: string;
  label: string;
  addressLine: string | null;
  area: string | null;
  city: string;
  state: string | null;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [cartTotal, setCartTotal] = useState<{ subtotal: number; deliveryFee: number; total: number } | null>(null);

  const [newAddress, setNewAddress] = useState({ addressLine: "", area: "", city: "", state: "" });

  useEffect(() => {
    (async () => {
      const [meRes, locRes, cartRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/location"),
        fetch("/api/cart"),
      ]);
      const me = await meRes.json();
      const loc = await locRes.json();
      const cart = await cartRes.json();

      setName(me.user?.name ?? "");
      setPhone(me.user?.phone ?? "");
      setAddresses(loc.locations ?? []);
      setSelectedAddressId(loc.locations?.[0]?.id ?? null);
      setCartTotal({ subtotal: cart.subtotal, deliveryFee: cart.deliveryFee, total: cart.total });
      if (!loc.locations?.length) setShowAddForm(true);
      setLoading(false);
    })();
  }, []);

  async function saveNewAddress() {
    if (!newAddress.city.trim()) {
      toast.error("City is required");
      return null;
    }
    const res = await fetch("/api/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newAddress, label: "Delivery" }),
    });
    if (!res.ok) {
      toast.error("Could not save address");
      return null;
    }
    const data = await res.json();
    setAddresses((prev) => [data.location, ...prev]);
    setSelectedAddressId(data.location.id);
    setShowAddForm(false);
    return data.location.id as string;
  }

  async function placeOrder() {
    if (!name.trim() || phone.trim().length < 10) {
      toast.error("Enter your name and a valid phone number");
      return;
    }
    let addressId = selectedAddressId;
    if (showAddForm || !addressId) {
      addressId = await saveNewAddress();
      if (!addressId) return;
    }

    setPlacing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId,
          customerName: name,
          customerPhone: phone,
          notes: notes || undefined,
          paymentMethod: "COD",
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

  return (
    <div className="animate-fade-in pb-32">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-100 bg-white/95 px-4 py-4 backdrop-blur">
        <Link href="/buyer/cart">
          <ArrowLeft className="h-5 w-5 text-zinc-700" />
        </Link>
        <h1 className="text-lg font-extrabold text-zinc-900">Checkout</h1>
      </div>

      <div className="space-y-6 px-4 py-5">
        <section>
          <h2 className="mb-3 text-sm font-bold text-zinc-900">Customer details</h2>
          <div className="space-y-3">
            <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </section>

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
                    <p className="font-semibold text-zinc-900">{addr.label}</p>
                    <p className="text-zinc-500">
                      {[addr.addressLine, addr.area, addr.city, addr.state].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  {selectedAddressId === addr.id && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
                </button>
              ))}
            </div>
          )}

          {showAddForm && (
            <div className="space-y-3 rounded-xl border border-zinc-200 p-3">
              <Input
                label="Address line"
                placeholder="House no, street, landmark"
                value={newAddress.addressLine}
                onChange={(e) => setNewAddress((s) => ({ ...s, addressLine: e.target.value }))}
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
              <Input
                label="State"
                value={newAddress.state}
                onChange={(e) => setNewAddress((s) => ({ ...s, state: e.target.value }))}
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
            <div className="flex items-center gap-3 rounded-xl border border-brand-500 bg-brand-50 p-3">
              <Wallet className="h-4 w-4 text-brand-600" />
              <span className="flex-1 text-sm font-semibold text-zinc-900">Cash on Delivery</span>
              <Check className="h-4 w-4 text-brand-600" />
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 opacity-50">
              <CreditCard className="h-4 w-4 text-zinc-400" />
              <span className="flex-1 text-sm font-semibold text-zinc-500">Online payment</span>
              <span className="text-[11px] font-semibold text-zinc-400">Coming soon</span>
            </div>
          </div>
        </section>

        {cartTotal && (
          <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
            <Row label="Subtotal" value={formatCurrency(cartTotal.subtotal)} />
            <Row label="Delivery charge" value={cartTotal.deliveryFee ? formatCurrency(cartTotal.deliveryFee) : "Free"} />
            <div className="my-1 border-t border-dashed border-zinc-200" />
            <Row label="Total" value={formatCurrency(cartTotal.total)} bold />
          </section>
        )}
      </div>

      <div className="app-shell fixed inset-x-0 bottom-0 z-40 border-t border-zinc-100 bg-white p-4">
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

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { MapPin, Navigation, Search, LocateFixed, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CITIES, findCity } from "@/lib/geo-data";

type Coords = { latitude: number; longitude: number } | null;

export default function BuyerLocationPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"prompt" | "manual" | "confirm">("prompt");
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [coords, setCoords] = useState<Coords>(null);
  const [query, setQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  const results = useMemo(() => findCity(query), [query]);

  async function requestGps() {
    setLocating(true);
    if (!("geolocation" in navigator)) {
      toast.error("Location isn't supported on this device");
      setMode("manual");
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setCoords(c);
        await tryReverseGeocode(c);
        setLocating(false);
      },
      () => {
        toast("Location permission denied", { icon: "📍" });
        setLocating(false);
        setMode("manual");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function tryReverseGeocode(c: { latitude: number; longitude: number }) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${c.latitude}&lon=${c.longitude}`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) throw new Error("reverse geocode failed");
      const data = await res.json();
      const addr = data.address ?? {};
      const city = addr.city || addr.town || addr.village || addr.county || null;
      const state = addr.state || null;
      const area = addr.suburb || addr.neighbourhood || addr.city_district || null;
      if (city) {
        setSelectedCity(city);
        setSelectedState(state);
        setSelectedArea(area);
        setMode("confirm");
        return;
      }
      throw new Error("no city resolved");
    } catch {
      toast("Couldn't detect your area automatically — please confirm below", { icon: "📍" });
      setMode("manual");
    }
  }

  async function saveLocation(city: string, state: string | null, area: string | null) {
    setSaving(true);
    try {
      const res = await fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: "Current",
          city,
          state: state || undefined,
          area: area || undefined,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          isCurrent: true,
        }),
      });
      if (!res.ok) throw new Error("Could not save location");
      toast.success(`Location set to ${area ? `${area}, ` : ""}${city}`);
      router.replace("/buyer/home");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-white px-6 pb-10 pt-10">
      {mode === "prompt" && (
        <div className="flex flex-1 flex-col items-center justify-center text-center animate-fade-in-up">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50">
            <MapPin className="h-9 w-9 text-brand-600" />
          </div>
          <h1 className="mt-6 text-xl font-extrabold text-zinc-900">
            Allow location access to discover nearby stores
          </h1>
          <p className="mt-2 max-w-[320px] text-sm text-zinc-500">
            We use your location only to show you stores that deliver to your area and to
            calculate distance.
          </p>
          <div className="mt-8 w-full space-y-3">
            <Button size="lg" fullWidth loading={locating} onClick={requestGps}>
              <Navigation className="h-4 w-4" /> Use my current location
            </Button>
            <Button size="lg" variant="outline" fullWidth onClick={() => setMode("manual")}>
              Select your location manually
            </Button>
          </div>
        </div>
      )}

      {mode === "confirm" && selectedCity && (
        <div className="flex flex-1 flex-col items-center justify-center text-center animate-scale-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-success-50">
            <CheckCircle2 className="h-9 w-9 text-success-500" />
          </div>
          <h1 className="mt-6 text-xl font-extrabold text-zinc-900">Location detected</h1>
          <p className="mt-2 text-lg font-semibold text-zinc-800">
            📍 {selectedArea ? `${selectedArea}, ` : ""}
            {selectedCity}
          </p>
          {selectedState && <p className="text-sm text-zinc-500">{selectedState}</p>}
          <div className="mt-8 w-full space-y-3">
            <Button
              size="lg"
              fullWidth
              loading={saving}
              onClick={() => saveLocation(selectedCity, selectedState, selectedArea)}
            >
              Confirm &amp; continue
            </Button>
            <Button size="lg" variant="ghost" fullWidth onClick={() => setMode("manual")}>
              Choose a different location
            </Button>
          </div>
        </div>
      )}

      {mode === "manual" && (
        <div className="flex flex-1 flex-col animate-fade-in-up">
          <h1 className="text-xl font-extrabold text-zinc-900">Select your location manually</h1>
          <p className="mt-1 text-sm text-zinc-500">Search for your city, then pick your area.</p>

          <div className="mt-5">
            <Input
              placeholder="Search city..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedCity(null);
                setSelectedArea(null);
              }}
              prefix={<Search className="h-4 w-4" />}
              autoFocus
            />
          </div>

          {!selectedCity && (
            <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
              {results.length === 0 && (
                <p className="mt-6 text-center text-sm text-zinc-400">No matching cities yet.</p>
              )}
              {results.map((c) => (
                <button
                  key={c.city}
                  onClick={() => {
                    setSelectedCity(c.city);
                    setSelectedState(c.state);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-zinc-100 p-3 text-left transition hover:bg-zinc-50 active:scale-[0.99]"
                >
                  <LocateFixed className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{c.city}</p>
                    <p className="text-xs text-zinc-500">{c.state}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedCity && (
            <div className="mt-5 flex-1 animate-fade-in">
              <p className="mb-2 text-sm font-semibold text-zinc-700">
                Select your area in {selectedCity}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(CITIES.find((c) => c.city === selectedCity)?.areas ?? []).map((area) => (
                  <button
                    key={area}
                    onClick={() => setSelectedArea(area)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
                      selectedArea === area
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
              <Button
                size="lg"
                fullWidth
                className="mt-6"
                loading={saving}
                disabled={!selectedArea}
                onClick={() => selectedCity && saveLocation(selectedCity, selectedState, selectedArea)}
              >
                Confirm &amp; continue
              </Button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

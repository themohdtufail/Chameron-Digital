"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Settings as SettingsIcon, ToggleLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";

interface SettingRow {
  key: string;
  label: string;
  group: string;
  default: string;
  value: string;
  isOverridden: boolean;
}

interface FlagRow {
  key: string;
  label: string;
  description: string;
  isEnabled: boolean;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingRow[] | null>(null);
  const [flags, setFlags] = useState<FlagRow[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function load() {
    const [settingsRes, flagsRes] = await Promise.all([
      fetch("/api/admin/settings", { cache: "no-store" }),
      fetch("/api/admin/feature-flags", { cache: "no-store" }),
    ]);
    const settingsData = await settingsRes.json();
    const flagsData = await flagsRes.json();
    setSettings(settingsData.settings ?? []);
    setDraft(Object.fromEntries((settingsData.settings ?? []).map((s: SettingRow) => [s.key, s.value])));
    setFlags(flagsData.flags ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSetting(key: string) {
    setSavingKey(key);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: draft[key] ?? "" }),
    });
    setSavingKey(null);
    if (!res.ok) {
      toast.error("Could not save setting");
      return;
    }
    toast.success("Saved");
    load();
  }

  async function toggleFlag(key: string, isEnabled: boolean) {
    const res = await fetch("/api/admin/feature-flags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, isEnabled }),
    });
    if (!res.ok) {
      toast.error("Could not update feature flag");
      return;
    }
    toast.success(`${key} ${isEnabled ? "enabled" : "disabled"}`);
    load();
  }

  if (!settings || !flags) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const groups = Array.from(new Set(settings.map((s) => s.group)));

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-zinc-900">
        <SettingsIcon className="h-5 w-5" /> Platform settings
      </h1>

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-card">
            <p className="mb-3 text-sm font-bold text-zinc-900">{group}</p>
            <div className="space-y-3">
              {settings
                .filter((s) => s.group === group)
                .map((s) => (
                  <div key={s.key} className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        label={s.label}
                        value={draft[s.key] ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, [s.key]: e.target.value }))}
                        placeholder={s.default}
                      />
                      {!s.isOverridden && <p className="mt-1 text-xs text-zinc-400">Using default: {s.default}</p>}
                    </div>
                    <Button size="sm" loading={savingKey === s.key} onClick={() => saveSetting(s.key)}>
                      Save
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-6 flex items-center gap-2 text-lg font-extrabold text-zinc-900">
        <ToggleLeft className="h-5 w-5" /> Feature flags
      </h2>
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-card">
        <div className="divide-y divide-zinc-100">
          {flags.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900">{f.label}</p>
                <p className="text-xs text-zinc-500">{f.description}</p>
              </div>
              <button
                onClick={() => toggleFlag(f.key, !f.isEnabled)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${f.isEnabled ? "bg-brand-600" : "bg-zinc-300"}`}
                aria-label={`Toggle ${f.label}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${f.isEnabled ? "left-5" : "left-0.5"}`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

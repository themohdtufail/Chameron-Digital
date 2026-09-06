"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBar({
  placeholder = "Search stores, products...",
  defaultValue = "",
  action = "/buyer/search",
}: {
  placeholder?: string;
  defaultValue?: string;
  action?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`${action}?q=${encodeURIComponent(value)}`);
      }}
      className="relative"
    >
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-3.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
      />
    </form>
  );
}

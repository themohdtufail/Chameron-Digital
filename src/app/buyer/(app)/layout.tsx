import { BottomNav } from "@/components/buyer/BottomNav";

export default function BuyerAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell relative pb-20">
      {children}
      <BottomNav />
    </div>
  );
}

import { BottomNav } from "@/components/buyer/BottomNav";
import { DesktopHeader } from "@/components/buyer/DesktopHeader";

export default function BuyerAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell relative pb-20 lg:pb-0">
      <DesktopHeader />
      {children}
      <BottomNav />
    </div>
  );
}

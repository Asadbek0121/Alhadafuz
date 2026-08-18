import { Bell } from "lucide-react";

// Oddiy statik qo'ng'iroq ikonkasi — animatsiyasiz, doim ko'rinadi.
// Boshqa header ikonkalari (Heart/ShoppingBag/UserCircle) bilan bir xil 24px,
// bir xil qalinlik va markazlashda turishi uchun.
export default function NotificationIcon({ size = 24, className = "text-slate-600 group-hover:text-blue-600 transition-colors" }: { size?: number; className?: string }) {
  return <Bell size={size} strokeWidth={2} className={className} />;
}

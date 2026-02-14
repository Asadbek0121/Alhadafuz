
import LiveMap from "@/components/admin/LiveMap";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function AdminMapPage() {
    return (
        <div className="p-8 space-y-8 bg-gray-50/50 min-h-screen">
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/shipping"
                    className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 border border-gray-100 shadow-sm transition-all active:scale-95"
                >
                    <ChevronLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">KURYERLAR MONITORINGI</h1>
                    <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-1">Hadaf Logistics Real-Vaqt Tizimi</p>
                </div>
            </div>

            <LiveMap />
        </div>
    );
}


"use client";

import { useState, useEffect } from "react";
import { Truck, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Courier {
    id: string;
    name: string;
    courierProfile?: {
        status: string;
        rating: number;
    };
}

export default function CourierSelector({
    orderId,
    currentCourierId,
    orderStatus
}: {
    orderId: string;
    currentCourierId?: string;
    orderStatus: string;
}) {
    const [couriers, setCouriers] = useState<Courier[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchCouriers();
    }, []);

    const fetchCouriers = async () => {
        try {
            const res = await fetch('/api/admin/couriers');
            if (res.ok) {
                const data = await res.json();
                setCouriers(data);
            }
        } catch (e) {
            console.error("Fetch couriers error", e);
        }
    };

    const handleAssign = async (courierId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/orders/${orderId}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courierId })
            });

            if (res.ok) {
                toast.success("Kuryer biriktirildi!");
                setIsOpen(false);
                router.refresh();
            } else {
                toast.error("Xatolik yuz berdi");
            }
        } catch (e) {
            toast.error("Tarmoq xatosi");
        } finally {
            setLoading(false);
        }
    };

    const activeCourier = couriers.find(c => c.id === currentCourierId);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${currentCourierId
                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                    : 'bg-orange-50 text-orange-600 border-orange-100 animate-pulse'
                    }`}
            >
                <Truck size={16} />
                {activeCourier ? activeCourier.name : "Kuryerni tanlash"}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[100] overflow-hidden">
                    <div className="p-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kuryerlar ro'yxati</span>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-900">×</button>
                    </div>

                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {couriers.length === 0 && (
                            <div className="p-10 text-center space-y-2">
                                <Truck size={32} className="mx-auto text-gray-200" />
                                <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">Kuryerlar topilmadi</div>
                            </div>
                        )}
                        {couriers.map((courier) => (
                            <button
                                key={courier.id}
                                onClick={() => handleAssign(courier.id)}
                                disabled={loading}
                                className={`w-full p-4 flex items-center justify-between hover:bg-blue-50/50 transition-all border-b border-gray-50 last:border-0 group ${currentCourierId === courier.id ? 'bg-blue-50/30' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 font-bold group-hover:bg-white group-hover:text-blue-600 transition-colors">
                                        {courier.name?.[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-black text-gray-900 text-sm flex items-center gap-2">
                                            {courier.name}
                                            <span className="text-[10px] text-amber-500">★ {Number(courier.courierProfile?.rating || 5).toFixed(1)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${courier.courierProfile?.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                                            <span className={`text-[10px] font-black uppercase ${courier.courierProfile?.status === 'ONLINE' ? 'text-emerald-500' : 'text-gray-400'}`}>
                                                {courier.courierProfile?.status || 'OFFLINE'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {currentCourierId === courier.id ? (
                                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-100">
                                        <Check size={12} className="text-white" />
                                    </div>
                                ) : loading ? (
                                    <Loader2 size={16} className="text-blue-600 animate-spin" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-100 group-hover:border-blue-400 transition-colors" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

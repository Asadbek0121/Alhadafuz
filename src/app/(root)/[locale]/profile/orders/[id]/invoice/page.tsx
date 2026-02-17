
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import { Printer, Package, CheckCircle2, User, MapPin, Building, CreditCard } from "lucide-react";

export default function OrderInvoicePage() {
    const params = useParams();
    const id = params.id as string;
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const contentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: contentRef as any,
    });

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await fetch(`/api/orders/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setOrder(data.order || data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">INVOYS TAYYORLANMOQDA...</div>;
    if (!order) return <div className="p-20 text-center text-red-500 font-bold">Xatolik: Buyurtma topilmadi.</div>;

    return (
        <div className="min-h-screen bg-slate-100 py-12 px-4">
            <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center no-print">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">BUYURTMA INVOYSI</h1>
                <button
                    onClick={() => handlePrint()}
                    className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95"
                >
                    <Printer size={18} />
                    PDF YUKLASH / PRINT
                </button>
            </div>

            <div ref={contentRef} className="bg-white rounded-[40px] shadow-2xl p-12 border border-slate-100 text-slate-800">
                {/* Brand Header */}
                <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10">
                    <div>
                        <div className="flex items-center gap-0 mb-4">
                            <span className="text-2xl font-black tracking-tighter text-[#0052FF] uppercase">Hadaf</span>
                            <span className="text-2xl font-light tracking-tighter text-slate-400 uppercase">Market</span>
                        </div>
                        <h2 className="text-4xl font-black tracking-tighter text-slate-900">TO'LOV VARAQASI</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Buyurtma #</p>
                        <p className="text-xl font-black">{order.id.slice(-8).toUpperCase()}</p>
                        <p className="text-xs font-bold text-slate-400 mt-2">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-12 py-12 border-b border-slate-100">
                    <div className="space-y-6">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Buyurtmachi</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400"><User size={18} /></div>
                                <div>
                                    <p className="text-sm font-black">{order.shippingName || 'Mijoz'}</p>
                                    <p className="text-xs font-bold text-slate-400">{order.shippingPhone}</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Yetkazib berish manzili</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400"><MapPin size={18} /></div>
                                <div>
                                    <p className="text-xs font-bold text-slate-600 line-clamp-2">{order.shippingAddress}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">To'lov shakli</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400"><CreditCard size={18} /></div>
                                <div>
                                    <p className="text-sm font-black uppercase">{order.paymentMethod}</p>
                                    <p className="text-[10px] font-black text-emerald-500 uppercase">{order.paymentStatus}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="py-12">
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-slate-100">
                            <tr>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Maхsulot</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Soni</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Narxi</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Jami</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {order.items?.map((item: any) => (
                                <tr key={item.id}>
                                    <td className="py-6 pr-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden shrink-0">
                                                <img src={item.image} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <p className="font-black text-sm text-slate-900 leading-tight uppercase tracking-tight">{item.title}</p>
                                        </div>
                                    </td>
                                    <td className="py-6 text-center font-bold text-slate-500">{item.quantity}</td>
                                    <td className="py-6 text-right font-bold text-slate-500">{item.price.toLocaleString()}</td>
                                    <td className="py-6 text-right font-black text-slate-900">{(item.price * item.quantity).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Summary */}
                <div className="flex justify-end pt-8">
                    <div className="w-80 space-y-4">
                        <div className="flex justify-between items-center text-slate-400">
                            <span className="text-[10px] font-black uppercase tracking-widest">Subtotal</span>
                            <span className="font-bold">{(order.total - (order.deliveryFee || 0)).toLocaleString()} UZS</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                            <span className="text-[10px] font-black uppercase tracking-widest">Yetkazish</span>
                            <span className="font-bold">{(order.deliveryFee || 0).toLocaleString()} UZS</span>
                        </div>
                        {order.discountAmount > 0 && (
                            <div className="flex justify-between items-center text-emerald-500">
                                <span className="text-[10px] font-black uppercase tracking-widest">Chegirma</span>
                                <span className="font-bold">-{order.discountAmount.toLocaleString()} UZS</span>
                            </div>
                        )}
                        <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-center">
                            <span className="text-[12px] font-black uppercase tracking-widest">Jami To'lov</span>
                            <span className="text-2xl font-black text-slate-900 whitespace-nowrap">{order.total.toLocaleString()} UZS</span>
                        </div>
                    </div>
                </div>

                {/* Legal Footer */}
                <div className="mt-24 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4">Hadaf Marketplace - Rasmiy Invoys</p>
                    <div className="bg-slate-50 p-6 rounded-2xl flex items-center justify-center gap-8">
                        <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Toshkent, O'zbekiston</p>
                            <p className="text-[10px] font-bold">+998 (--) --- -- --</p>
                        </div>
                        <div className="w-px h-8 bg-slate-200"></div>
                        <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Sayt</p>
                            <p className="text-[10px] font-bold">uzm.uz</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


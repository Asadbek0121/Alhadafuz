
"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import { Printer, Download, Package, Calendar, User, DollarSign } from "lucide-react";

export default function CourierReportPage() {
    const searchParams = useSearchParams();
    const userId = searchParams.get("userId");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const contentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: contentRef as any,
    });

    useEffect(() => {
        if (!userId) return;

        const fetchData = async () => {
            try {
                const res = await fetch(`/api/reports/courier?userId=${userId}`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId]);

    if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">HISOBOT TAYYORLANMOQDA...</div>;

    if (!data) return <div className="p-20 text-center text-red-500 font-bold">Xatolik: Ma'lumot topilmadi.</div>;

    return (
        <div className="min-h-screen bg-slate-100 py-12 px-4">
            <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center no-print">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">KURYER HISOBOTI</h1>
                <button
                    onClick={() => handlePrint()}
                    className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                >
                    <Printer size={18} />
                    PDF YUKLASH / PRINT
                </button>
            </div>

            {/* Printable Content */}
            <div ref={contentRef} className="bg-white rounded-[40px] shadow-2xl p-12 border border-slate-100 text-slate-800">
                {/* Header */}
                <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10">
                    <div>
                        <div className="bg-slate-900 text-white px-4 py-1 text-[10px] font-black tracking-widest uppercase mb-4 inline-block">HADAF MARKETPLACE</div>
                        <h2 className="text-4xl font-black tracking-tighter text-slate-900">KURYERLIK FAOLIYATI</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Sana</p>
                        <p className="text-xl font-black">{new Date().toLocaleDateString('uz-UZ')}</p>
                    </div>
                </div>

                {/* Courier Info */}
                <div className="grid grid-cols-2 gap-12 py-12 border-b border-slate-100">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center"><User size={20} /></div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Kuryer</p>
                                <p className="text-lg font-black">{data.courierName}</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Hamyon balansi</p>
                        <p className="text-3xl font-black text-blue-600">{(data.balance || 0).toLocaleString()} SO'M</p>
                    </div>
                </div>

                {/* Stats Table */}
                <div className="py-12">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2">
                        <Package size={18} />
                        BUGUNGI BUYURTMALAR RO'YXATI
                    </h3>
                    <div className="overflow-hidden rounded-3xl border border-slate-100">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">ID</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Manzil</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Sana</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-right">Summa</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.orders?.map((o: any) => (
                                    <tr key={o.id}>
                                        <td className="px-6 py-4 font-black text-sm">#{o.id.slice(-6).toUpperCase()}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-500">{o.shippingAddress}</td>
                                        <td className="px-6 py-4 text-xs font-bold text-slate-400">{new Date(o.finishedAt).toLocaleTimeString()}</td>
                                        <td className="px-6 py-4 text-sm font-black text-right">{o.total.toLocaleString()} UZS</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Sum */}
                <div className="bg-slate-50 p-10 rounded-[40px] flex justify-between items-center border-2 border-dashed border-slate-200 mt-12">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Jami buyurtmalar soni</p>
                        <p className="text-3xl font-black text-slate-900">{data.orders?.length || 0} ta</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Bugungi umumiy daromad</p>
                        <p className="text-4xl font-bold text-slate-900 leading-none">
                            <span className="text-lg font-black mr-2 text-slate-400">≈</span>
                            {((data.orders?.length || 0) * (data.courierFee || 12000)).toLocaleString()} SO'M
                        </p>
                    </div>
                </div>

                {/* Signature */}
                <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between italic text-slate-400 text-sm">
                    <p>Elektron generated report - {new Date().toISOString()}</p>
                    <p>Hadaf Dispatcher System v2.0</p>
                </div>
            </div>
        </div>
    );
}

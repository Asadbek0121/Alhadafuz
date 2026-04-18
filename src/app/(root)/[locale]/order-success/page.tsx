"use client";

import { CheckCircle, ArrowRight, Package, CreditCard, Copy, UploadCloud, ShieldCheck, Loader2, Info } from 'lucide-react';
import { Link } from '@/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function OrderSuccessPage() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const t = useTranslations('OrderSuccess');
    
    const [order, setOrder] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [isUploaded, setIsUploaded] = useState(false);

    useEffect(() => {
        if (!orderId) return;

        const fetchData = async () => {
            try {
                // Fetch order details
                const orderRes = await fetch(`/api/orders/${orderId}`);
                if (orderRes.ok) {
                    const orderData = await orderRes.json();
                    setOrder(orderData);
                    setIsUploaded(!!orderData.paymentScreenshot);

                    // Fetch store settings for card info
                    const settingsRes = await fetch('/api/settings');
                    if (settingsRes.ok) {
                        const settingsData = await settingsRes.json();
                        setSettings(settingsData);
                    }
                }
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [orderId]);

    const copyToClipboard = (text: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.success(`${label} nusxalandi`);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !orderId) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            // 1. Upload file
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const uploadData = await uploadRes.json();

            if (!uploadRes.ok) throw new Error(uploadData.error || "Rasm yuklashda xatolik");

            // 2. Update order with screenshot URL
            const updateRes = await fetch(`/api/orders/${orderId}/payment-p2p`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ screenshotUrl: uploadData.url })
            });

            if (updateRes.ok) {
                setIsUploaded(true);
                toast.success("To'lov cheki yuborildi! Admin tez orada tekshiradi.");
            } else {
                throw new Error("Buyurtmani yangilashda xatolik");
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    const isP2P = order?.paymentMethod === 'P2P';

    return (
        <div className="min-h-screen bg-[#fafafb] py-12 md:py-24 px-4 font-sans">
            <div className="max-w-3xl mx-auto flex flex-col items-center">
                
                {/* Success Icon & Header */}
                <div className="mb-12 text-center">
                    <div className="w-24 h-24 bg-emerald-100 rounded-[2rem] flex items-center justify-center mx-auto mb-8 animate-bounce-subtle">
                        <CheckCircle size={48} className="text-emerald-600" strokeWidth={2.5} />
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">{t('title')}</h1>
                    <p className="text-lg text-slate-500 font-medium max-w-md mx-auto">{t('subtitle')}</p>
                </div>

                {/* Order ID Badge */}
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm font-black text-slate-900 mb-10">
                    <Package size={20} className="text-blue-600" />
                    <span className="uppercase tracking-widest text-xs">BUYURTMA RAQAMI: #{orderId?.slice(-8).toUpperCase()}</span>
                </div>

                {/* P2P Instructions Section */}
                {isP2P && (
                    <div className="w-full bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden mb-12 animate-slide-up">
                        <div className="p-8 md:p-12">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                    <CreditCard size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Kartaga to'lov</h3>
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">To'lovni tasdiqlash jarayoni</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                {/* Card Details */}
                                <div className="space-y-6">
                                    <div className="p-6 bg-slate-900 rounded-[32px] text-white relative overflow-hidden group min-h-[160px]">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                        <div className="relative z-10">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">To'lov uchun karta</p>
                                            <div className="flex items-center justify-between mb-6">
                                                <h4 className="text-xl md:text-2xl font-black tracking-widest font-mono">
                                                    {settings?.cardNumber || "8600 **** **** ****"}
                                                </h4>
                                                <button title="Nusxa" onClick={() => copyToClipboard(settings?.cardNumber, "Karta raqami")} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                                    <Copy size={18} />
                                                </button>
                                            </div>
                                            <div className="flex items-end justify-between">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ega</p>
                                                    <p className="font-bold text-sm">{settings?.cardHolderName || "---- ----"}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Summa</p>
                                                    <p className="text-xl font-black text-blue-400">{order?.total?.toLocaleString()} SO'M</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                        <Info size={16} className="text-amber-600 mt-0.5 shrink-0" />
                                        <p className="text-[11px] font-bold text-amber-700 leading-relaxed uppercase">
                                            Iltimos, to'lovni yuqoridagi kartaga o'tkazing va to'lov muvaffaqiyatli o'tganini tasdiqlovchi chekni yuklang.
                                        </p>
                                    </div>
                                </div>

                                {/* Upload Section */}
                                <div className="flex flex-col">
                                    <div className="flex-1 min-h-[180px] relative group">
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            disabled={uploading || isUploaded}
                                            title="Chekni yuklang"
                                        />
                                        <div className={`h-full border-4 border-dashed rounded-[32px] flex flex-col items-center justify-center gap-4 transition-all duration-300 ${isUploaded ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-100 group-hover:border-blue-400 group-hover:bg-blue-50/50'}`}>
                                            {uploading ? (
                                                <div className="flex flex-col items-center gap-4 text-blue-600">
                                                    <Loader2 size={32} className="animate-spin" />
                                                    <span className="text-[11px] font-black uppercase">Yuklanmoqda...</span>
                                                </div>
                                            ) : isUploaded ? (
                                                <div className="flex flex-col items-center gap-4 text-emerald-600 text-center px-4">
                                                    <ShieldCheck size={40} />
                                                    <div>
                                                        <span className="text-[11px] font-black uppercase block mb-1">Chek yuborildi</span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Admin tez orada tasdiqlaydi</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-4 text-slate-400">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-blue-600 transition-transform group-hover:scale-110">
                                                        <UploadCloud size={32} />
                                                    </div>
                                                    <span className="text-[11px] font-black uppercase text-slate-900 group-hover:text-blue-600 transition-colors">To'lov chekini yuklang</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bottom Actions */}
                <div className="w-full flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href={`/track/${orderId}`} className="flex-1 sm:max-w-[280px] h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-[20px] shadow-2xl shadow-blue-600/20 flex items-center justify-center gap-3 font-black text-sm uppercase tracking-wider transition-all transform hover:scale-[1.02] active:scale-95">
                        🚚 BUYURTMANI KUZATISH
                    </Link>
                    <Link href="/" className="flex-1 sm:max-w-[180px] h-16 bg-white border border-slate-100 hover:bg-slate-50 text-slate-900 rounded-[20px] shadow-sm flex items-center justify-center gap-3 font-black text-sm uppercase tracking-wider transition-all">
                        {t('btn_home')}
                    </Link>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 4s ease-in-out infinite;
                }
                @keyframes slide-up {
                    from { transform: translateY(40px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up {
                    animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}} />
        </div>
    );
}

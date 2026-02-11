"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Send, ShoppingBag, Truck, BarChart3, Clock } from 'lucide-react';

interface VendorApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function VendorApplicationModal({ isOpen, onClose }: VendorApplicationModalProps) {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get('name'),
            phone: formData.get('phone'),
            category: formData.get('category'),
            message: formData.get('message'),
        };

        try {
            const res = await fetch('/api/vendor-application', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                setIsSubmitted(true);
            }
        } catch (error) {
            console.error("Submission error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative bg-white w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
                    >
                        {/* 1. Left Sidebar - Why Join? (Premium Look) */}
                        <div className="md:w-1/3 bg-blue-600 p-8 text-white relative overflow-hidden hidden md:block">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>

                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div>
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border border-white/20">
                                        <ShoppingBag size={24} />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-4">HADAF Vendor</h3>
                                    <p className="text-blue-100 text-sm leading-relaxed mb-8">
                                        Biznesingizni HADAF bilan kengaytiring. Biz bilan hamkorlik qiling va millionlab foydalanuvchilarga mahsulotingizni soting.
                                    </p>

                                    <div className="space-y-4">
                                        {[
                                            { icon: BarChart3, text: "Katta bozor va ko'p savdo" },
                                            { icon: Truck, text: "Tayyor yetkazib berish tizimi" },
                                            { icon: Clock, text: "24/7 do'kon boshqaruvi" }
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-3 text-sm font-medium text-blue-50">
                                                <div className="p-1.5 bg-white/10 rounded-lg">
                                                    <item.icon size={16} />
                                                </div>
                                                {item.text}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    <div className="text-[10px] uppercase font-black tracking-widest text-blue-200/50">Partnership Program</div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Right Side - The Form */}
                        <div className="flex-1 p-8 md:p-12 relative">
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors"
                            >
                                <X size={20} />
                            </button>

                            {!isSubmitted ? (
                                <div className="animate-fade-in">
                                    <div className="mb-8">
                                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">Hamkorlik so'rovi</h2>
                                        <p className="text-gray-500 font-medium">Ma'lumotlaringizni qoldiring, menedjerlarimiz siz bilan bog'lanishadi.</p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">F.I.SH / Tadbirkor nomi</label>
                                                <input
                                                    required
                                                    name="name"
                                                    type="text"
                                                    placeholder="Ismingizni kiriting"
                                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-gray-900 font-medium"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Telefon raqam</label>
                                                <input
                                                    required
                                                    name="phone"
                                                    type="tel"
                                                    placeholder="+998"
                                                    defaultValue="+998 "
                                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-gray-900 font-medium"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Mahsulot toifasi</label>
                                            <select name="category" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-gray-900 font-medium appearance-none">
                                                <option>Elektronika va Gadjetlar</option>
                                                <option>Kiyim-kechak va Poyabzal</option>
                                                <option>Maishiy texnika</option>
                                                <option>Uy va Bog' uchun</option>
                                                <option>Boshqa...</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Qo'shimcha ma'lumot (Ixtiyoriy)</label>
                                            <textarea
                                                rows={3}
                                                name="message"
                                                placeholder="Biznesingiz haqida qisqacha..."
                                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-gray-900 font-medium resize-none"
                                            ></textarea>
                                        </div>

                                        <button
                                            disabled={loading}
                                            className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70 disabled:grayscale"
                                        >
                                            {loading ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            ) : (
                                                <>Yuborish <Send size={18} /></>
                                            )}
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="h-full flex flex-col items-center justify-center text-center py-12"
                                >
                                    <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-8 shadow-inner shadow-green-100">
                                        <CheckCircle size={48} />
                                    </div>
                                    <h2 className="text-3xl font-black text-gray-900 mb-4">So'rovingiz yuborildi!</h2>
                                    <p className="text-gray-500 font-medium max-w-sm mb-10 leading-relaxed">
                                        Muvaffaqiyatli qabul qilindi. Bizning menedjerlarimiz tez orada (24 soat ichida) siz bilan bog'lanishadi.
                                    </p>
                                    <button
                                        onClick={onClose}
                                        className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95"
                                    >
                                        Dargohga qaytish
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

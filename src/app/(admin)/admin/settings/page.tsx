"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Save, Loader2, Store, Phone, Mail, MapPin,
    Globe, Facebook, Instagram, Youtube, Send,
    Settings, LayoutDashboard, MessageCircle
} from 'lucide-react';
import TelegramSettings from '@/components/admin/TelegramSettings';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function AdminSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        siteName: '',
        phone: '',
        email: '',
        address: '',
        socialLinks: { telegram: '', instagram: '', facebook: '', youtube: '', supportTelegram: '' }
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings');
            if (res.ok) {
                const data = await res.json();
                let social = { telegram: '', instagram: '', facebook: '', youtube: '', supportTelegram: '' };
                if (data.socialLinks) {
                    try { social = { ...social, ...JSON.parse(data.socialLinks) }; } catch (e) { }
                }
                setFormData({
                    siteName: data.siteName || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    address: data.address || '',
                    socialLinks: social
                });
            }
        } catch (e) {
            toast.error("Sozlamalarni yuklashda xatolik");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...formData,
                socialLinks: JSON.stringify(formData.socialLinks)
            };
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Sozlamalar saqlandi");
            } else {
                toast.error("Xatolik");
            }
        } catch (e) {
            toast.error("Xatolik");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-gray-400 font-medium animate-pulse">Sozlamalar yuklanmoqda...</p>
        </div>
    );

    return (
        <div className="p-8 space-y-8 bg-gray-50/30 min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Do'kon Sozlamalari</h1>
                    <p className="text-gray-500 text-sm font-medium">Platformaning asosiy ma'lumotlari va aloqa vositalari</p>
                </div>
                <Button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-12 shadow-xl shadow-blue-200/50 transition-all active:scale-95 px-8 font-black tracking-tight uppercase"
                >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    {saving ? "SAQLANMOQDA..." : "SAQLASH"}
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: General & Contact */}
                <div className="xl:col-span-2 space-y-8">

                    {/* General Settings Card */}
                    <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm relative overflow-hidden group">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-inner">
                                <Store size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Asosiy Ma'lumotlar</h3>
                                <p className="text-sm font-medium text-gray-400">Sayt nomi va brending</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sayt Nomi</label>
                            <input
                                value={formData.siteName}
                                onChange={e => setFormData({ ...formData, siteName: e.target.value })}
                                placeholder="UzMarket"
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white p-4 rounded-[20px] outline-none transition-all font-bold text-gray-900 text-lg placeholder:font-medium placeholder:text-gray-300"
                            />
                        </div>
                    </div>

                    {/* Contact Info Card */}
                    <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm relative overflow-hidden group">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-inner">
                                <MapPin size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Aloqa Ma'lumotlari</h3>
                                <p className="text-sm font-medium text-gray-400">Footer va kontaktlar sahifasi uchun</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                                    <Phone size={10} /> Telefon Raqam
                                </label>
                                <input
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+998 71 123 45 67"
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white p-4 rounded-[20px] outline-none transition-all font-bold text-gray-900 placeholder:font-medium placeholder:text-gray-300"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                                    <Mail size={10} /> Email
                                </label>
                                <input
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="info@uzmarket.uz"
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white p-4 rounded-[20px] outline-none transition-all font-bold text-gray-900 placeholder:font-medium placeholder:text-gray-300"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Manzil</label>
                                <textarea
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Toshkent shahri, ..."
                                    rows={2}
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white p-4 rounded-[24px] outline-none transition-all font-medium text-gray-900 placeholder:text-gray-300 resize-none"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                                    <MessageCircle size={10} /> Qo'llab-quvvatlash Telegrami (Username)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
                                    <input
                                        value={(formData.socialLinks as any).supportTelegram?.replace('@', '') || ''}
                                        onChange={e => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, supportTelegram: e.target.value } } as any)}
                                        placeholder="uzmarketsupport"
                                        className="w-full bg-blue-50/30 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 pl-8 rounded-[20px] outline-none transition-all font-bold text-gray-900 placeholder:font-medium placeholder:text-gray-300"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 ml-1 font-medium">Agar bo'sh qoldirilsa, asosiy kanal havolasi ishlatiladi.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Social & Telegram */}
                <div className="space-y-8">
                    {/* Social Media Card */}
                    <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm relative overflow-hidden group">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-500 shadow-inner">
                                <Globe size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Ijtimoiy Tarmoqlar</h3>
                                <p className="text-sm font-medium text-gray-400">Saytda ko'rsatiladigan havolalar</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                                    <Send size={18} />
                                </div>
                                <input
                                    value={formData.socialLinks.telegram}
                                    onChange={e => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, telegram: e.target.value } })}
                                    placeholder="t.me/kanal"
                                    className="flex-1 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-3 rounded-xl outline-none transition-all font-medium text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500 shrink-0">
                                    <Instagram size={18} />
                                </div>
                                <input
                                    value={formData.socialLinks.instagram}
                                    onChange={e => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, instagram: e.target.value } })}
                                    placeholder="instagram.com/profile"
                                    className="flex-1 bg-gray-50 border-2 border-transparent focus:border-pink-500 focus:bg-white p-3 rounded-xl outline-none transition-all font-medium text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                    <Facebook size={18} />
                                </div>
                                <input
                                    value={formData.socialLinks.facebook}
                                    onChange={e => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, facebook: e.target.value } })}
                                    placeholder="facebook.com/page"
                                    className="flex-1 bg-gray-50 border-2 border-transparent focus:border-blue-600 focus:bg-white p-3 rounded-xl outline-none transition-all font-medium text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                                    <Youtube size={18} />
                                </div>
                                <input
                                    value={formData.socialLinks.youtube}
                                    onChange={e => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, youtube: e.target.value } })}
                                    placeholder="youtube.com/channel"
                                    className="flex-1 bg-gray-50 border-2 border-transparent focus:border-red-500 focus:bg-white p-3 rounded-xl outline-none transition-all font-medium text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Telegram Settings Component */}
                    <TelegramSettings />
                </div>
            </div>
        </div>
    );
}

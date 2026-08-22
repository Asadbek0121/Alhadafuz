"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Save, Loader2, Store, Phone, Mail, MapPin,
    Globe,
    Settings, LayoutDashboard, MessageCircle, CreditCard
} from 'lucide-react';
import { SocialIcon } from '@/components/SocialIcons';
import TelegramSettings from '@/components/admin/TelegramSettings';
import AnnouncementSettings from '@/components/admin/AnnouncementSettings';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { normalizeSocialLinks, serializeSocialLinks } from '@/lib/social-links';

export default function AdminSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        siteName: '',
        phone: '',
        email: '',
        address: '',
        socialLinks: { telegram: '', instagram: '', facebook: '', youtube: '', supportTelegram: '' },
        cardNumber: '',
        cardHolderName: ''
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings');
            if (res.ok) {
                const data = await res.json();
                // normalizeSocialLinks legacy formatlarni ham taniydi ("0": {platform,url}, array, ...)
                const social = normalizeSocialLinks(data.socialLinks);
                setFormData({
                    siteName: data.siteName || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    address: data.address || '',
                    socialLinks: social,
                    cardNumber: data.cardNumber || '',
                    cardHolderName: data.cardHolderName || ''
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
                socialLinks: serializeSocialLinks(normalizeSocialLinks(formData.socialLinks))
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
        <div className="flex flex-col items-center justify-center min-h-[200px] space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-gray-400 font-medium animate-pulse">Sozlamalar yuklanmoqda...</p>
        </div>
    );

    return (
        <div className="p-5 space-y-4 bg-gray-50/30 min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="space-y-1">
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">Do'kon Sozlamalari</h1>
                    <p className="text-gray-500 text-sm font-medium">Platformaning asosiy ma'lumotlari va aloqa vositalari</p>
                </div>
                <Button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 shadow-md shadow-blue-200/50 transition-all active:scale-95 px-4 font-black tracking-tight uppercase"
                >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {saving ? "SAQLANMOQDA..." : "SAQLASH"}
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Left Column: General & Contact */}
                <div className="xl:col-span-2 space-y-4">

                    {/* General Settings Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm relative overflow-hidden group">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-inner">
                                <Store size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900 tracking-tight">Asosiy Ma'lumotlar</h3>
                                <p className="text-xs font-medium text-gray-400">Sayt nomi va brending</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="site-name" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sayt Nomi</label>
                            <input
                                id="site-name"
                                value={formData.siteName}
                                onChange={e => setFormData({ ...formData, siteName: e.target.value })}
                                placeholder="Hadaf Market"
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white p-2.5 rounded-xl outline-none transition-all font-bold text-gray-900 text-base placeholder:font-medium placeholder:text-gray-300"
                            />
                        </div>
                    </div>

                    {/* Contact Info Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm relative overflow-hidden group">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-inner">
                                <MapPin size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900 tracking-tight">Aloqa Ma'lumotlari</h3>
                                <p className="text-xs font-medium text-gray-400">Footer va kontaktlar sahifasi uchun</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="shop-phone" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                                    <Phone size={10} /> Telefon Raqam
                                </label>
                                <input
                                    id="shop-phone"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+998 __ ___ __ __"
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white p-2.5 rounded-xl outline-none transition-all font-bold text-gray-900 placeholder:font-medium placeholder:text-gray-300"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="shop-email" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                                    <Mail size={10} /> Email
                                </label>
                                <input
                                    id="shop-email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="info@example.com"
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white p-2.5 rounded-xl outline-none transition-all font-bold text-gray-900 placeholder:font-medium placeholder:text-gray-300"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <label htmlFor="shop-address" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Manzil</label>
                                <textarea
                                    id="shop-address"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Termiz shahri, ..."
                                    rows={2}
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white p-2.5 rounded-xl outline-none transition-all font-medium text-gray-900 placeholder:text-gray-300 resize-none"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <label htmlFor="support-telegram" className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                                    <MessageCircle size={10} /> Qo'llab-quvvatlash Telegrami (Username)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
                                    <input
                                        id="support-telegram"
                                        value={(formData.socialLinks as any).supportTelegram?.replace('@', '') || ''}
                                        onChange={e => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, supportTelegram: e.target.value } } as any)}
                                        placeholder="hadaf_uz"
                                        className="w-full bg-blue-50/30 border-2 border-transparent focus:border-blue-500 focus:bg-white p-2.5 pl-7 rounded-xl outline-none transition-all font-bold text-gray-900 placeholder:font-medium placeholder:text-gray-300"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 ml-1 font-medium">Agar bo'sh qoldirilsa, asosiy kanal havolasi ishlatiladi.</p>
                            </div>
                        </div>
                    </div>

                    {/* Payment Info Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm relative overflow-hidden group">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shadow-inner">
                                <CreditCard size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900 tracking-tight">To'lov Ma'lumotlari (P2P)</h3>
                                <p className="text-xs font-medium text-gray-400">Haridorlar kartadan to'lov qilishlari uchun</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="card-number" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Karta Raqami</label>
                                <input
                                    id="card-number"
                                    value={formData.cardNumber}
                                    onChange={e => setFormData({ ...formData, cardNumber: e.target.value })}
                                    placeholder="8600 0000 0000 0000"
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-2.5 rounded-xl outline-none transition-all font-bold text-gray-900 placeholder:font-medium placeholder:text-gray-300"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="card-holder" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Karta Egasi (F.I.SH)</label>
                                <input
                                    id="card-holder"
                                    value={formData.cardHolderName}
                                    onChange={e => setFormData({ ...formData, cardHolderName: e.target.value })}
                                    placeholder="FALONCHIYEV FALONCHI"
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-2.5 rounded-xl outline-none transition-all font-bold text-gray-900 placeholder:font-medium placeholder:text-gray-300"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Social & Telegram */}
                <div className="space-y-4">
                    {/* Social Media Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm relative overflow-hidden group">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500 shadow-inner">
                                <Globe size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900 tracking-tight">Ijtimoiy Tarmoqlar</h3>
                                <p className="text-xs font-medium text-gray-400">Saytda ko'rsatiladigan havolalar</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2.5">
                                <label htmlFor="social-telegram" className="sr-only">Telegram</label>
                                <SocialIcon brand="telegram" size={32} />
                                <input
                                    id="social-telegram"
                                    value={formData.socialLinks.telegram}
                                    onChange={e => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, telegram: e.target.value } })}
                                    placeholder="t.me/kanal"
                                    className="flex-1 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-2 rounded-lg outline-none transition-all font-medium text-sm"
                                    aria-label="Telegram kanali"
                                />
                            </div>
                            <div className="flex items-center gap-2.5">
                                <label htmlFor="social-instagram" className="sr-only">Instagram</label>
                                <SocialIcon brand="instagram" size={32} />
                                <input
                                    id="social-instagram"
                                    value={formData.socialLinks.instagram}
                                    onChange={e => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, instagram: e.target.value } })}
                                    placeholder="instagram.com/profile"
                                    className="flex-1 bg-gray-50 border-2 border-transparent focus:border-pink-500 focus:bg-white p-2 rounded-lg outline-none transition-all font-medium text-sm"
                                    aria-label="Instagram sahifasi"
                                />
                            </div>
                            <div className="flex items-center gap-2.5">
                                <label htmlFor="social-facebook" className="sr-only">Facebook</label>
                                <SocialIcon brand="facebook" size={32} />
                                <input
                                    id="social-facebook"
                                    value={formData.socialLinks.facebook}
                                    onChange={e => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, facebook: e.target.value } })}
                                    placeholder="facebook.com/page"
                                    className="flex-1 bg-gray-50 border-2 border-transparent focus:border-blue-600 focus:bg-white p-2 rounded-lg outline-none transition-all font-medium text-sm"
                                    aria-label="Facebook sahifasi"
                                />
                            </div>
                            <div className="flex items-center gap-2.5">
                                <label htmlFor="social-youtube" className="sr-only">Youtube</label>
                                <SocialIcon brand="youtube" size={32} />
                                <input
                                    id="social-youtube"
                                    value={formData.socialLinks.youtube}
                                    onChange={e => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, youtube: e.target.value } })}
                                    placeholder="youtube.com/channel"
                                    className="flex-1 bg-gray-50 border-2 border-transparent focus:border-red-500 focus:bg-white p-2 rounded-lg outline-none transition-all font-medium text-sm"
                                    aria-label="Youtube kanali"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Telegram Settings Component */}
                    <TelegramSettings />

                    {/* Header announcement marquee boshqaruvi */}
                    <AnnouncementSettings />
                </div>
            </div>
        </div>
    );
}

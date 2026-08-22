"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Megaphone, X, CheckCircle2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Announcement {
    id: string;
    text: string;
    backgroundColor?: string | null;
    textColor?: string | null;
    icon?: string | null;
    isActive: boolean;
    order: number;
    startAt?: string | null;
    endAt?: string | null;
}

const BG_COLORS = [
    { label: 'Yellow', value: '#fef3c7' },
    { label: 'Blue', value: '#dbeafe' },
    { label: 'Green', value: '#dcfce7' },
    { label: 'Red', value: '#fee2e2' },
    { label: 'Neutral', value: '#f1f5f9' },
    { label: 'Dark', value: '#1e293b' },
];

const BG_TEXT = { '#fef3c7': '#713f12', '#dbeafe': '#1e3a8a', '#dcfce7': '#14532d', '#fee2e2': '#7f1d1d', '#f1f5f9': '#334155', '#1e293b': '#f1f5f9' };

export default function AnnouncementSettings() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    // Yangi announcement draft
    const [draft, setDraft] = useState({
        text: '',
        backgroundColor: '#fef3c7',
        icon: '🛠️',
        isActive: true
    });

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/announcements');
            if (res.ok) setAnnouncements(await res.json());
        } catch (e) {
            toast.error("Xabarlarni yuklashda xatolik");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const saveAnnouncement = async (id: string, patch: Partial<Announcement>) => {
        setSavingId(id);
        try {
            const res = await fetch(`/api/admin/announcements/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch)
            });
            if (res.ok) {
                toast.success("Saqlandi");
                fetchData();
            } else {
                toast.error("Xatolik");
            }
        } catch (e) {
            toast.error("Xatolik");
        } finally {
            setSavingId(null);
        }
    };

    const createAnnouncement = async () => {
        if (!draft.text.trim()) {
            toast.error("Matn kiritilishi shart");
            return;
        }
        try {
            const res = await fetch('/api/admin/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...draft,
                    order: announcements.length
                })
            });
            if (res.ok) {
                toast.success("Xabar yaratildi");
                setShowForm(false);
                setDraft({ text: '', backgroundColor: '#fef3c7', icon: '🛠️', isActive: true });
                fetchData();
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data?.error || "Xatolik");
            }
        } catch (e) {
            toast.error("Xatolik");
        }
    };

    const removeAnnouncement = async (id: string) => {
        if (!confirm("Xabarni o'chirishni tasdiqlaysizmi?")) return;
        try {
            const res = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("O'chirildi");
                fetchData();
            }
        } catch (e) {
            toast.error("Xatolik");
        }
    };

    const move = (index: number, dir: -1 | 1) => {
        const next = [...announcements];
        const target = index + dir;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        setAnnouncements(next);
        // Tartibni saqlash
        next.forEach((a, i) => {
            saveAnnouncement(a.id, { order: i });
        });
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-inner">
                    <Megaphone size={18} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">Header Xabari</h3>
                    <p className="text-xs font-medium text-gray-400">Location'dan keyingi announcement marquee</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-6"><Loader2 className="animate-spin text-amber-500" /></div>
            ) : announcements.length === 0 ? (
                <p className="text-xs text-gray-400 font-medium mb-3">Hozircha xabarlar yo'q. Faol xabar bo'lmasa announcement ko'rinmaydi.</p>
            ) : (
                <div className="space-y-2 mb-3">
                    {announcements.map((a, index) => {
                        const bg = a.backgroundColor || '#fef3c7';
                        const fg = a.textColor || BG_TEXT[bg as keyof typeof BG_TEXT] || '#713f12';
                        return (
                            <div key={a.id} className="p-2.5 rounded-xl border border-gray-100 space-y-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => move(index, -1)}
                                        disabled={index === 0 || savingId === a.id}
                                        className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                                        title="Yuqoriga"
                                    >
                                        <ArrowUp size={13} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => move(index, 1)}
                                        disabled={index === announcements.length - 1 || savingId === a.id}
                                        className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                                        title="Pastga"
                                    >
                                        <ArrowDown size={13} />
                                    </button>
                                    {/* Preview */}
                                    <div
                                        className="flex-1 min-w-0 truncate rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
                                        style={{ background: bg, color: fg }}
                                    >
                                        {a.icon} {a.text}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => saveAnnouncement(a.id, { isActive: !a.isActive })}
                                        disabled={savingId === a.id}
                                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase flex-none ${a.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}
                                        title={a.isActive ? "Faol — yopish" : "Nofaol — yoqish"}
                                    >
                                        {savingId === a.id ? <Loader2 size={10} className="animate-spin" /> : a.isActive ? <CheckCircle2 size={11} /> : <X size={11} />}
                                        {a.isActive ? "Faol" : "Nofaol"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeAnnouncement(a.id)}
                                        className="w-6 h-6 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50"
                                        title="O'chirish"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                                {/* Rang tanlash */}
                                <div className="flex items-center gap-1.5 pl-10">
                                    {BG_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => saveAnnouncement(a.id, { backgroundColor: c.value, textColor: BG_TEXT[c.value as keyof typeof BG_TEXT] })}
                                            disabled={savingId === a.id}
                                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-200 transition-all hover:scale-110"
                                            style={{ background: c.value }}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!showForm ? (
                <Button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="w-full gap-2 border-2 border-dashed border-amber-200 bg-amber-50/50 text-amber-600 hover:bg-amber-50 rounded-xl h-10 font-black"
                >
                    <Plus size={16} /> Yangi xabar
                </Button>
            ) : (
                <div className="space-y-2 border-2 border-amber-200 rounded-xl p-3 bg-amber-50/30">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Matn</label>
                        <textarea
                            value={draft.text}
                            onChange={e => setDraft({ ...draft, text: e.target.value })}
                            rows={2}
                            placeholder="Sayt hozir test rejimida ishlamoqda..."
                            className="w-full bg-white border-2 border-transparent focus:border-amber-500 p-2.5 rounded-xl outline-none transition-all font-medium text-sm text-gray-900 placeholder:text-gray-300 resize-none"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rang</label>
                            <div className="flex items-center gap-1.5">
                                {BG_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => setDraft({ ...draft, backgroundColor: c.value })}
                                        className={`w-6 h-6 rounded-full border-2 shadow-sm ring-1 ring-gray-200 transition-all hover:scale-110 ${draft.backgroundColor === c.value ? 'ring-2 ring-blue-400 scale-110' : ''}`}
                                        style={{ background: c.value }}
                                        title={c.label}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1.5 w-[100px]">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Icon</label>
                            <input
                                value={draft.icon || ''}
                                onChange={e => setDraft({ ...draft, icon: e.target.value })}
                                className="w-full bg-white border-2 border-transparent focus:border-amber-500 p-2 rounded-xl outline-none transition-all font-medium text-center"
                                maxLength={4}
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                        <Button
                            type="button"
                            onClick={createAnnouncement}
                            className="flex-1 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white h-9 rounded-xl font-black"
                        >
                            <Plus size={14} /> Qo'shish
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="h-9 px-3 rounded-xl font-bold border-gray-200 text-gray-500">
                            Bekor
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

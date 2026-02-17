"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Trash2, CheckCircle2, Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations, useLocale, useMessages } from "next-intl";

interface Address {
    id: string;
    title: string;
    city: string;
    district: string;
    street: string;
    house: string;
    isDefault: boolean;
}

import { regions, districts } from "@/constants/locations";

export default function AddressBookPage() {
    const t = useTranslations('Addresses');
    const tLoc = useTranslations('Locations');
    const tProfile = useTranslations('Profile');
    const locale = useLocale();
    const messages = useMessages() as any;
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Safe translation helper that accesses messages directly
    const safeTranslate = (key: string) => {
        if (!key) return '';
        // Directly access the Locations messages
        const locationMessages = messages?.Locations;
        if (locationMessages && locationMessages[key]) {
            return locationMessages[key];
        }
        // Fallback to original key if translation not found
        return key;
    };

    // address state: city -> region, district -> specific district
    const [newAddress, setNewAddress] = useState({
        title: "",
        city: "", // Stores Region Name 
        district: "",
        street: "",
        house: "",
        isDefault: false
    });

    const { data: addresses = [], isLoading, isError } = useQuery<Address[]>({
        queryKey: ["addresses"],
        queryFn: async () => {
            const res = await fetch("/api/user/addresses");
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/user/addresses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to create");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["addresses"] });
            setIsModalOpen(false);
            setNewAddress({ title: "", city: "", district: "", street: "", house: "", isDefault: false });
            toast.success(t('success'));
        },
        onError: () => toast.error(t('fail')),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/user/addresses/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["addresses"] });
            toast.success(t('delete_success'));
        },
    });

    const realSetDefault = useMutation({
        mutationFn: async (addr: Address) => {
            // We need to pass valid data. The API expects title/city/street etc. 
            // We will just send the same data but with isDefault: true.
            const res = await fetch(`/api/user/addresses/${addr.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: addr.title,
                    city: addr.city,
                    district: addr.district,
                    street: addr.street,
                    house: addr.house,
                    isDefault: true
                }),
            });
            if (!res.ok) throw new Error("Failed to set default");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["addresses"] });
            toast.success(t('default_success'));
        }
    });


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(newAddress);
    };

    // Helper to find region ID by name (if city stores name)
    // Or we store ID in city and Display Name in UI? 
    // Let's store Region Name in 'city' field to keep backend simple for now, 
    // and District Name in 'district'.

    const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const regionName = e.target.value;
        setNewAddress({ ...newAddress, city: regionName, district: "" });
    };

    // Help find current region ID for districts selection
    const currentRegionId = newAddress.city;
    const availableDistricts = currentRegionId ? districts[currentRegionId] : [];

    if (isLoading) return <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    if (isError) return <div className="text-center text-red-500 py-10">{t('load_failed')} <Button onClick={() => queryClient.refetchQueries({ queryKey: ["addresses"] })} variant="outline" className="ml-2">{t('retry')}</Button></div>;

    return (
        <div className="space-y-3.5 md:space-y-6">
            <div className="flex items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="min-w-0">
                    <h1 className="text-base md:text-2xl font-black text-gray-900 leading-tight">{t('title')}</h1>
                    <p className="text-[11px] md:text-sm text-text-muted mt-0.5 line-clamp-1">{t('subtitle')}</p>
                </div>
                <Button
                    onClick={() => setIsModalOpen(true)}
                    className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 h-9 md:h-11 px-3 md:px-5 active:scale-95 transition-all"
                >
                    <Plus size={16} className="mr-1 md:mr-2" />
                    <span className="text-[11px] md:text-sm font-black uppercase tracking-tight">{t('add_new')}</span>
                </Button>
            </div>

            {addresses.length === 0 ? (
                <div className="text-center py-10 md:py-16 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 shadow-sm">
                        <MapPin size={28} className="text-slate-300" />
                    </div>
                    <p className="text-gray-400 text-sm md:text-lg font-bold">{t('no_addresses')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {addresses.map((addr) => (
                        <div key={addr.id} className={`group bg-white p-4 md:p-6 rounded-2xl border transition-all relative ${addr.isDefault ? "border-blue-600 ring-4 ring-blue-600/5 shadow-md shadow-blue-900/5" : "border-gray-100 hover:border-blue-200"
                            }`}>
                            {addr.isDefault && (
                                <div className="absolute top-4 right-4 md:top-6 md:right-6 text-blue-600 animate-fade-in">
                                    <CheckCircle2 size={18} fill="currentColor" className="text-white fill-blue-600 md:w-6 md:h-6" />
                                </div>
                            )}

                            <div className="flex items-center gap-3 mb-3 md:mb-4">
                                <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-transform group-active:scale-95 ${addr.isDefault ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-slate-50 text-slate-400 border border-slate-100"
                                    }`}>
                                    <Navigation size={18} className="md:w-5 md:h-5" />
                                </div>
                                <div className="min-w-0 pr-8">
                                    <h3 className="font-bold text-[13px] md:text-base text-gray-900 truncate">
                                        {addr.title === "My Address" || addr.title === "Mening manzilim" || addr.title === "Мой адрес"
                                            ? tProfile('my_address')
                                            : addr.title}
                                    </h3>
                                    {addr.isDefault && <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter leading-none">{t('default')}</span>}
                                </div>
                            </div>

                            <div className="space-y-1 text-xs md:text-sm mb-4 md:mb-6">
                                <p className="font-bold text-gray-700 leading-tight line-clamp-1">
                                    {safeTranslate(addr.city)}, {safeTranslate(addr.district)}
                                </p>
                                <p className="text-text-muted font-medium line-clamp-1 opacity-70">{addr.street}, {addr.house}</p>
                            </div>

                            <div className="flex items-center gap-2">
                                {!addr.isDefault && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[9px] md:text-xs px-2.5 md:px-3 font-bold border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 bg-slate-50/50"
                                        onClick={() => realSetDefault.mutate(addr)}
                                        disabled={realSetDefault.isPending}
                                    >
                                        {t('set_default').toUpperCase()}
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="ml-auto text-rose-400 hover:text-rose-500 hover:bg-rose-50 h-8 w-8 md:h-9 md:w-9 rounded-xl transition-colors"
                                    onClick={() => deleteMutation.mutate(addr.id)}
                                    disabled={deleteMutation.isPending}
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Simple Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 md:p-4 animate-fade-in">
                    <div className="bg-white rounded-t-[2rem] md:rounded-[2rem] w-full max-w-md p-5 pb-8 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-lg md:text-xl font-black text-gray-900 leading-tight">{t('modal_title')}</h2>
                                <div className="w-8 h-1 bg-blue-600 rounded-full mt-1 md:hidden opacity-20"></div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-gray-600 transition-colors">
                                <Plus size={20} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="gap-3 md:gap-4 flex flex-col">
                            <div className="space-y-1">
                                <Label className="text-[11px] font-bold text-gray-700 uppercase tracking-tight ml-1">{t('label_title')}</Label>
                                <Input
                                    value={newAddress.title}
                                    onChange={e => setNewAddress({ ...newAddress, title: e.target.value })}
                                    required
                                    placeholder={t('label_title')}
                                    className="h-10 md:h-12 text-sm rounded-xl border-gray-100 bg-slate-50/50 focus:bg-white focus:border-blue-500 transition-all font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-bold text-gray-700 uppercase tracking-tight ml-1">{t('label_region')}</Label>
                                    <select
                                        className="w-full h-10 md:h-12 px-3 rounded-xl border border-gray-100 bg-slate-50/50 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-medium"
                                        value={newAddress.city}
                                        onChange={handleRegionChange}
                                        required
                                    >
                                        <option value="">{t('select_region')}</option>
                                        {regions.map(r => (
                                            <option key={r.id} value={r.id}>{safeTranslate(r.id)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-bold text-gray-700 uppercase tracking-tight ml-1">{t('label_district')}</Label>
                                    <select
                                        className="w-full h-10 md:h-12 px-3 rounded-xl border border-gray-100 bg-slate-50/50 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-medium disabled:opacity-50"
                                        value={newAddress.district}
                                        onChange={e => setNewAddress({ ...newAddress, district: e.target.value })}
                                        required
                                        disabled={!newAddress.city}
                                    >
                                        <option value="">{t('select_district')}</option>
                                        {availableDistricts.map(d => (
                                            <option key={d} value={d}>{safeTranslate(d)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[11px] font-bold text-gray-700 uppercase tracking-tight ml-1">{t('label_street')}</Label>
                                <Input
                                    value={newAddress.street}
                                    onChange={e => setNewAddress({ ...newAddress, street: e.target.value })}
                                    required
                                    placeholder={t('label_street')}
                                    className="h-10 md:h-12 text-sm rounded-xl border-gray-100 bg-slate-50/50 focus:bg-white focus:border-blue-500 transition-all font-medium"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[11px] font-bold text-gray-700 uppercase tracking-tight ml-1">{t('label_house')}</Label>
                                <Input
                                    value={newAddress.house}
                                    onChange={e => setNewAddress({ ...newAddress, house: e.target.value })}
                                    required
                                    placeholder={t('label_house')}
                                    className="h-10 md:h-12 text-sm rounded-xl border-gray-100 bg-slate-50/50 focus:bg-white focus:border-blue-500 transition-all font-medium"
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-1 ml-1">
                                <input type="checkbox" id="isDefault"
                                    checked={newAddress.isDefault}
                                    onChange={e => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                                    className="w-4 h-4 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                                />
                                <Label htmlFor="isDefault" className="mb-0 text-[11px] font-bold text-gray-600 uppercase tracking-tight cursor-pointer">{t('label_default')}</Label>
                            </div>
                            <div className="flex gap-2 mt-4 md:mt-6">
                                <Button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="h-11 md:h-12 w-full bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all"
                                >
                                    {createMutation.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : t('save').toUpperCase()}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

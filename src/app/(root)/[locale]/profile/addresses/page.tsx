"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Trash2, CheckCircle2, Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

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
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);

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

    // Find the current region ID based on the selected name to show correct districts
    const currentRegionId = regions.find(r => r.name === newAddress.city)?.id;
    const availableDistricts = currentRegionId ? districts[currentRegionId] : [];

    if (isLoading) return <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    if (isError) return <div className="text-center text-red-500 py-10">Failed to load addresses. <Button onClick={() => queryClient.refetchQueries({ queryKey: ["addresses"] })} variant="outline" className="ml-2">Retry</Button></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">{t('title')}</h1>
                    <p className="text-text-muted mt-1 dark:text-gray-400">{t('subtitle')}</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="rounded-full shadow-lg shadow-primary/20">
                    <Plus size={20} className="mr-2" />
                    {t('add_new')}
                </Button>
            </div>

            {addresses.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed text-gray-400 dark:bg-gray-800/50 dark:border-gray-700">
                    <MapPin size={48} className="mx-auto mb-4 opacity-50" />
                    <p>{t('no_addresses')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((addr) => (
                        <div key={addr.id} className={`bg-white p-6 rounded-2xl border transition-all relative group dark:bg-gray-800 ${addr.isDefault ? "border-primary ring-4 ring-primary/5" : "border-gray-100 hover:border-gray-200 dark:border-gray-700"
                            }`}>
                            {addr.isDefault && (
                                <div className="absolute top-6 right-6 text-primary">
                                    <CheckCircle2 size={24} fill="currentColor" className="text-white fill-primary" />
                                </div>
                            )}

                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${addr.isDefault ? "bg-primary text-white" : "bg-gray-100 text-text-muted dark:bg-gray-700"
                                    }`}>
                                    <Navigation size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold dark:text-white">{addr.title}</h3>
                                    {addr.isDefault && <span className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none">{t('default')}</span>}
                                </div>
                            </div>

                            <div className="space-y-1 text-sm text-text-muted mb-6 dark:text-gray-400">
                                <p className="font-medium text-text-main dark:text-gray-200">{addr.city}, {addr.district}</p>
                                <p>{addr.street}, {addr.house}</p>
                            </div>

                            <div className="flex items-center gap-2">
                                {!addr.isDefault && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => realSetDefault.mutate(addr)}
                                        disabled={realSetDefault.isPending}
                                    >
                                        {t('set_default')}
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="ml-auto text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => deleteMutation.mutate(addr.id)}
                                    disabled={deleteMutation.isPending}
                                >
                                    <Trash2 size={18} />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Simple Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl dark:bg-gray-800">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">{t('modal_title')}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label>{t('label_title')}</Label>
                                <Input value={newAddress.title} onChange={e => setNewAddress({ ...newAddress, title: e.target.value })} required placeholder="Home" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="mb-1.5 block">{t('label_region')}</Label>
                                    <select
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={newAddress.city}
                                        onChange={handleRegionChange}
                                        required
                                    >
                                        <option value="">{t('select_region')}</option>
                                        {regions.map(r => (
                                            <option key={r.id} value={r.name}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t('label_district')}</Label>
                                    <select
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={newAddress.district}
                                        onChange={e => setNewAddress({ ...newAddress, district: e.target.value })}
                                        required
                                        disabled={!newAddress.city}
                                    >
                                        <option value="">{t('select_district')}</option>
                                        {availableDistricts.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <Label>{t('label_street')}</Label>
                                <Input value={newAddress.street} onChange={e => setNewAddress({ ...newAddress, street: e.target.value })} required placeholder="Amir Temur" />
                            </div>
                            <div>
                                <Label>{t('label_house')}</Label>
                                <Input value={newAddress.house} onChange={e => setNewAddress({ ...newAddress, house: e.target.value })} required placeholder="12" />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="isDefault"
                                    checked={newAddress.isDefault}
                                    onChange={e => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor="isDefault" className="mb-0">{t('label_default')}</Label>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
                                <Button type="submit" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : t('save')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

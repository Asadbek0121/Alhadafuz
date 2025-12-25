"use client";

import { MapPin, Phone, Clock, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type Store = {
    id: string;
    name: string;
    address: string;
    phone: string | null;
    workingHours: string | null;
};

export default function StoresPage() {
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/stores')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setStores(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="container py-20 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-6">Bizning Do'konlar</h1>

            {stores.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                    Hozircha do'konlar ro'yxati bo'sh. Tez orada ochiladi!
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stores.map(store => (
                        <div key={store.id} className="border rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                            <h3 className="text-xl font-bold mb-4 text-blue-600">{store.name}</h3>
                            <div className="space-y-3 text-gray-600">
                                <div className="flex items-start gap-3">
                                    <MapPin className="shrink-0 mt-1" size={20} />
                                    <span>{store.address}</span>
                                </div>
                                {store.phone && (
                                    <div className="flex items-center gap-3">
                                        <Phone className="shrink-0" size={20} />
                                        <span>{store.phone}</span>
                                    </div>
                                )}
                                {store.workingHours && (
                                    <div className="flex items-center gap-3">
                                        <Clock className="shrink-0" size={20} />
                                        <span>{store.workingHours}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-8 p-4 bg-gray-100 rounded-lg text-center text-gray-600">
                Tez orada boshqa viloyatlarda ham filiallarimiz ochiladi!
            </div>
        </div>
    );
}

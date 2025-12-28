"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Trash, User, Package, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateOrderForm({ users, products }: { users: any[], products: any[] }) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Selected Data
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [cart, setCart] = useState<any[]>([]); // { product: ..., quantity: 1 }
    const [formData, setFormData] = useState({
        shippingAddress: '',
        shippingDistrict: '',
        shippingPhone: '',
        paymentMethod: 'CASH',
        comment: ''
    });

    // Search States
    const [searchTerm, setSearchTerm] = useState("");
    const [productSearch, setProductSearch] = useState("");

    const filteredUsers = users.filter((u: any) =>
        (u.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (u.phone || '').includes(searchTerm)
    ).slice(0, 5);

    const filteredProducts = products.filter((p: any) =>
        p.title.toLowerCase().includes(productSearch.toLowerCase())
    ).slice(0, 5);

    // Handlers
    const addToCart = (product: any) => {
        const existing = cart.find(i => i.product.id === product.id);
        if (existing) {
            setCart(cart.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setCart([...cart, { product, quantity: 1 }]);
        }
    };

    const removeFromCart = (id: string) => {
        setCart(cart.filter(i => i.product.id !== id));
    };

    const updateQuantity = (id: string, qty: number) => {
        if (qty < 1) return;
        setCart(cart.map(i => i.product.id === id ? { ...i, quantity: qty } : i));
    };

    const calculateTotal = () => {
        return cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    };

    const handleSubmit = async () => {
        if (!selectedUser || cart.length === 0) {
            toast.error("Foydalanuvchi yoki mahsulot tanlanmagan");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/admin/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: selectedUser.id,
                    items: cart.map(i => ({
                        id: i.product.id,
                        quantity: i.quantity,
                        price: i.product.price // Admin can maybe edit price later?
                    })),
                    deliveryAddress: {
                        address: formData.shippingAddress,
                        district: formData.shippingDistrict,
                        phone: formData.shippingPhone || selectedUser.phone,
                        name: selectedUser.name,
                        comment: formData.comment
                    },
                    paymentMethod: formData.paymentMethod
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed");
            }

            toast.success("Buyurtma muvaffaqiyatli yaratildi");
            // Hard reload to ensure fresh data and proper navigation
            window.location.href = '/admin/orders';
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">

            {/* Steps Indicator */}
            <div className="flex items-center justify-between mb-8">
                <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold border-current">1</div>
                    <span>Mijoz</span>
                </div>
                <div className="h-0.5 w-16 bg-gray-200"></div>
                <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold border-current">2</div>
                    <span>Mahsulotlar</span>
                </div>
                <div className="h-0.5 w-16 bg-gray-200"></div>
                <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold border-current">3</div>
                    <span>Tasdiqlash</span>
                </div>
            </div>

            {/* STEP 1: Select User */}
            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Mijozni tanlash</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <Input
                                placeholder="Ism yoki telefon raqam orqali qidirish..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="border rounded-md divide-y">
                            {filteredUsers.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">Mijoz topilmadi</div>
                            ) : (
                                filteredUsers.map((user: any) => (
                                    <div
                                        key={user.id}
                                        className={`p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''}`}
                                        onClick={() => setSelectedUser(user)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center md:text-sm text-xs font-bold text-gray-600">
                                                {user.name?.[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{user.name}</p>
                                                <p className="text-sm text-gray-500">{user.phone}</p>
                                            </div>
                                        </div>
                                        {selectedUser?.id === user.id && <Check className="text-blue-600" />}
                                    </div>
                                ))
                            )}
                        </div>

                        <Button
                            className="w-full mt-4"
                            disabled={!selectedUser}
                            onClick={() => {
                                setFormData(prev => ({
                                    ...prev,
                                    shippingPhone: selectedUser.phone || '',
                                    shippingDistrict: selectedUser.district || '' // Assuming user has district, else empty
                                }));
                                setStep(2);
                            }}
                        >
                            Davom etish
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* STEP 2: Select Products */}
            {step === 2 && (
                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>Mahsulot qo'shish</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                                <Input
                                    placeholder="Mahsulot nomini yozing..."
                                    className="pl-10"
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                />
                            </div>
                            <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
                                {filteredProducts.map((product: any) => (
                                    <div key={product.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                                <img src={product.image} alt="" className="w-full h-full object-cover rounded" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium line-clamp-1">{product.title}</p>
                                                <p className="text-xs text-blue-600 font-bold">{product.price.toLocaleString()} so'm</p>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => addToCart(product)}>
                                            <Plus size={16} />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>Tanlanganlar</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {cart.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    Savat bo'sh
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cart.map((item) => (
                                        <div key={item.product.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                            <div className="flex gap-2 items-center overflow-hidden">
                                                <div className="w-8 h-8 rounded bg-white shrink-0">
                                                    <img src={item.product.image} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-sm font-medium truncate w-[120px]">{item.product.title}</p>
                                                    <p className="text-xs text-gray-500">{item.product.price.toLocaleString()} x {item.quantity}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center border rounded bg-white h-7">
                                                    <button className="px-2" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>-</button>
                                                    <span className="text-xs px-1 w-6 text-center">{item.quantity}</span>
                                                    <button className="px-2" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>+</button>
                                                </div>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => removeFromCart(item.product.id)}>
                                                    <Trash size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="pt-4 border-t flex justify-between font-bold text-lg">
                                        <span>Jami:</span>
                                        <span>{calculateTotal().toLocaleString()} so'm</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" className="w-full" onClick={() => setStep(1)}>Orqaga</Button>
                                        <Button className="w-full" onClick={() => setStep(3)} disabled={cart.length === 0}>Davom etish</Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* STEP 3: Checkout Details */}
            {step === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Buyurtma ma'lumotlari</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Telefon raqam</Label>
                                <Input
                                    value={formData.shippingPhone}
                                    onChange={(e) => setFormData({ ...formData, shippingPhone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tuman</Label>
                                <Input
                                    value={formData.shippingDistrict}
                                    onChange={(e) => setFormData({ ...formData, shippingDistrict: e.target.value })}
                                    placeholder="Masalan: Yunusobod"
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Aniq manzil (Ko'cha, uy)</Label>
                                <Input
                                    value={formData.shippingAddress}
                                    onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                                    placeholder="Amir Temur ko'chasi, 15-uy"
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Izoh (ixtiyoriy)</Label>
                                <Input
                                    value={formData.comment}
                                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>To'lov turi</Label>
                                <select
                                    className="w-full border rounded-md h-10 px-3 bg-white"
                                    value={formData.paymentMethod}
                                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                >
                                    <option value="CASH">Naqd</option>
                                    <option value="CLICK">Click</option>
                                    <option value="PAYME">Payme</option>
                                    <option value="CARD">Karta (Terminal)</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center text-blue-900 border border-blue-100">
                            <div className="flex flex-col">
                                <span className="text-sm opacity-80">Mijoz: {selectedUser.name}</span>
                                <span className="font-bold text-xl">{calculateTotal().toLocaleString()} so'm</span>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={() => setStep(2)}>O'zgartirish</Button>
                                <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                                    {loading ? 'Yaratilmoqda...' : 'Buyurtma yaratish'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

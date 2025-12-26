
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { User, ShoppingCart, Heart, MapPin, Trash2, Clock, Package } from "lucide-react";
import DeleteUserButton from "./DeleteUserButton";
import { auth } from "@/auth";

export default async function UserDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') redirect('/');

    const user = await (prisma as any).user.findUnique({
        where: { id: params.id },
        include: {
            cart: {
                include: {
                    items: { include: { product: true } }
                }
            },
            orders: {
                orderBy: { createdAt: 'desc' },
                include: { items: true }
            },
        }
    });

    if (!user) notFound();

    // Fetch addresses separately
    const addresses = await (prisma as any).address?.findMany({
        where: { userId: user.id }
    }) || [];

    // Fetch wishlist separately to avoid validation errors if client is stale
    const wishlist = await (prisma as any).wishlist?.findUnique({
        where: { userId: user.id },
        include: { items: { include: { product: true } } }
    });

    // Calculate abandoned cart total
    const cartTotal = user.cart?.items.reduce((acc: number, item: any) => acc + (item.product.price * item.quantity), 0) || 0;

    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0066cc' }}>
                        {user.image ? (
                            <img src={user.image} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <User size={40} />
                        )}
                    </div>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>{user.name}</h1>
                        <div style={{ color: '#666' }}>{user.email}</div>
                        <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Ro'yxatdan o'tgan: {new Date(user.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>
                <DeleteUserButton userId={user.id} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Active Cart */}
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #eee' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ShoppingCart size={20} /> Faol Savat (Cart)
                        </h2>
                        {user.cart && user.cart.items.length > 0 ? (
                            <div>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    {user.cart.items.map((item: any) => (
                                        <div key={item.id} style={{ display: 'flex', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #f9f9f9' }}>
                                            <div style={{ width: '50px', height: '50px', background: '#f5f5f5', borderRadius: '6px', overflow: 'hidden' }}>
                                                <img src={item.product.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '500', fontSize: '14px' }}>{item.product.title}</div>
                                                <div style={{ fontSize: '13px', color: '#666' }}>
                                                    {item.quantity} x {item.product.price.toLocaleString()} so'm
                                                </div>
                                            </div>
                                            <div style={{ fontWeight: '600' }}>
                                                {(item.quantity * item.product.price).toLocaleString()} so'm
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginTop: '16px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>
                                    Jami: {cartTotal.toLocaleString()} so'm
                                </div>
                                <div style={{ marginTop: '10px', padding: '10px', background: '#fffbeb', color: '#b45309', borderRadius: '8px', fontSize: '13px' }}>
                                    ⚠️ Foydalanuvchi bu savatni hali rasmiylashtirmagan (Abandoned Checkout)
                                </div>
                            </div>
                        ) : (
                            <p style={{ color: '#888', fontStyle: 'italic' }}>Savat bo'sh</p>
                        )}
                    </div>

                    {/* Order History */}
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #eee' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Clock size={20} /> Buyurtmalar Tarixi
                        </h2>
                        {user.orders && user.orders.length > 0 ? (
                            <div style={{ display: 'grid', gap: '16px' }}>
                                {user.orders.map((order: any) => (
                                    <div key={order.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <span style={{ fontWeight: 'bold' }}>#{order.id.slice(-6)}</span>
                                            <span style={{
                                                fontSize: '12px', padding: '2px 8px', borderRadius: '10px', fontWeight: '600',
                                                background: order.status === 'COMPLETED' ? '#dcfce7' : order.status === 'PENDING' ? '#fef3c7' : '#f3f4f6',
                                                color: order.status === 'COMPLETED' ? '#16a34a' : order.status === 'PENDING' ? '#d97706' : '#6b7280'
                                            }}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                                            {new Date(order.createdAt).toLocaleDateString()} • {order.items.length} ta mahsulot
                                        </div>
                                        <div style={{ fontWeight: '600' }}>
                                            {order.total.toLocaleString()} so'm
                                        </div>
                                        <div style={{ marginTop: '12px' }}>
                                            <Link href={`/admin/orders/${order.id}`} style={{ fontSize: '13px', color: '#0066cc' }}>Batafsil ko'rish &rarr;</Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: '#888', fontStyle: 'italic' }}>Buyurtmalar yo'q</p>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* User Info & Contacts */}
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #eee' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <User size={20} /> Shaxsiy Ma'lumotlar
                        </h2>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '12px', color: '#888' }}>User ID</label>
                                <div style={{ fontWeight: '500', color: '#0066cc' }}>{user.uniqueId || "Mavjud emas"}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: '#888' }}>Email</label>
                                <div>{user.email}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: '#888' }}>Telefon</label>
                                <div>{user.phone || "Kiritilmagan"}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: '#888' }}>Rol</label>
                                <div>{user.role}</div>
                            </div>
                        </div>
                    </div>

                    {/* Addresses */}
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #eee' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <MapPin size={20} /> Manzillar
                        </h2>
                        {addresses.length > 0 ? (
                            <div style={{ display: 'grid', gap: '12px' }}>
                                {addresses.map((addr: any) => (
                                    <div key={addr.id} style={{ padding: '10px', background: '#f9f9f9', borderRadius: '8px', fontSize: '13px' }}>
                                        <div style={{ fontWeight: '600' }}>{addr.region}, {addr.district}</div>
                                        <div style={{ color: '#666' }}>{addr.street}, {addr.house}</div>
                                        {addr.isDefault && <span style={{ color: '#0066cc', fontSize: '11px' }}>Asosiy</span>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: '#888', fontStyle: 'italic', fontSize: '13px' }}>Manzillar saqlanmagan</p>
                        )}
                    </div>

                    {/* Wishlist */}
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #eee' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Heart size={20} /> Sevimlilar
                        </h2>
                        {wishlist && wishlist.items.length > 0 ? (
                            <div style={{ display: 'grid', gap: '10px' }}>
                                {wishlist.items.map((item: any) => (
                                    <div key={item.id} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: '#f5f5f5' }}>
                                            <img src={item.product.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: '500' }}>{item.product.title}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: '#888', fontStyle: 'italic', fontSize: '13px' }}>Hozircha bo'sh</p>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}

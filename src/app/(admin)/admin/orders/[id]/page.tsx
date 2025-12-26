
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin, User, Package, Calendar, CreditCard, ChevronDown } from "lucide-react";
import OrderStatusSelect from "../OrderStatusSelect";
import { auth } from "@/auth";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') redirect('/');

    const order = await prisma.order.findUnique({
        where: { id },
        include: {
            user: true,
            items: {
                include: {
                    product: true
                }
            }
        }
    });

    if (!order) notFound();

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '50px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                <Link href="/admin/orders" style={{
                    width: '40px', height: '40px', borderRadius: '50%', background: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid #eee', color: '#666'
                }}>
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        Buyurtma #{order.id.slice(-6).toUpperCase()}
                        <span style={{
                            fontSize: '14px', padding: '4px 12px', borderRadius: '20px',
                            background: order.status === 'COMPLETED' ? '#dcfce7' : order.status === 'PENDING' ? '#fef3c7' : '#f3f4f6',
                            color: order.status === 'COMPLETED' ? '#16a34a' : order.status === 'PENDING' ? '#d97706' : '#6b7280',
                            border: '1px solid transparent',
                            borderColor: order.status === 'COMPLETED' ? '#bbf7d0' : order.status === 'PENDING' ? '#fde68a' : '#e5e7eb'
                        }}>
                            {order.status}
                        </span>
                    </h1>
                    <div style={{ color: '#666', fontSize: '14px', marginTop: '4px', display: 'flex', gap: '15px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Calendar size={14} /> Created: {new Date(order.createdAt).toLocaleString()}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <CreditCard size={14} /> Payment: {order.paymentMethod || 'Cash'}
                        </span>
                    </div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                    <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* Left Column: Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #edf2f7', overflow: 'hidden' }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid #edf2f7', fontWeight: 'bold', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Package size={20} className="text-blue-500" />
                            Buyurtma tarkibi ({order.items.length})
                        </div>
                        <div>
                            {order.items.map((item) => (
                                <div key={item.id} style={{ display: 'flex', padding: '20px', borderBottom: '1px solid #f7fafc', gap: '20px', alignItems: 'center' }}>
                                    <div style={{ width: '70px', height: '70px', borderRadius: '10px', overflow: 'hidden', background: '#f7fafc', border: '1px solid #edf2f7' }}>
                                        {item.product.image ? (
                                            <img src={item.product.image} alt={item.product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e0' }}>
                                                <Package size={24} />
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontWeight: '600', marginBottom: '4px', color: '#2d3748' }}>{item.product.title}</h3>
                                        <p style={{ fontSize: '14px', color: '#718096' }}>
                                            {item.product.price.toLocaleString()} so'm x {item.quantity} dona
                                        </p>
                                    </div>
                                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#2d3748' }}>
                                        {(item.product.price * item.quantity).toLocaleString()} so'm
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '20px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#718096' }}>Umumiy summa</span>
                            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#2d3748' }}>{order.total.toLocaleString()} so'm</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Customer & Address */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Customer Info */}
                    <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #edf2f7', padding: '20px' }}>
                        <h3 style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <User size={18} className="text-blue-500" /> Mijoz ma'lumotlari
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#ebf8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3182ce', fontSize: '18px', fontWeight: 'bold' }}>
                                {order.user.name?.[0] || 'U'}
                            </div>
                            <div>
                                <div style={{ fontWeight: '600', color: '#2d3748' }}>{order.user.name || 'Nomsiz foydalanuvchi'}</div>
                                <div style={{ fontSize: '13px', color: '#718096' }}>ID: {order.user.uniqueId || '---'}</div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gap: '10px', fontSize: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#718096' }}>Email:</span>
                                <span style={{ color: '#2d3748' }}>{order.user.email}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#718096' }}>Telefon:</span>
                                <span style={{ color: '#2d3748' }}>{order.user.phone || '---'}</span>
                            </div>
                        </div>
                        <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #edf2f7', textAlign: 'center' }}>
                            <Link href={`/admin/users/${order.user.id}`} style={{ color: '#3182ce', fontSize: '14px', fontWeight: '500' }}>
                                Profilni ko'rish &rarr;
                            </Link>
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #edf2f7', padding: '20px' }}>
                        <h3 style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <MapPin size={18} className="text-green-500" /> Yetkazib berish manzili
                        </h3>
                        {order.shippingAddress || order.shippingCity ? (
                            <div style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.6' }}>
                                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{order.shippingCity}, {order.shippingDistrict}</div>
                                <div>{order.shippingAddress}</div>
                                <div>{order.shippingName} - {order.shippingPhone}</div>
                                {order.comment && (
                                    <div style={{ marginTop: '10px', padding: '10px', background: '#fffaf0', borderRadius: '8px', border: '1px solid #feeebc', color: '#744210', fontSize: '13px' }}>
                                        <span style={{ fontWeight: 'bold' }}>Izoh:</span> {order.comment}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ color: '#718096', fontStyle: 'italic', fontSize: '14px' }}>Manzil ma'lumotlari mavjud emas</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

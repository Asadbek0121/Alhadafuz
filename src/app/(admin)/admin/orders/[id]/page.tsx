
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin, User, Package, Calendar, CreditCard, ChevronDown, Tag } from "lucide-react";
import OrderStatusSelect from "../OrderStatusSelect";
import { auth } from "@/auth";
import BulkLabelPrinter from "@/components/admin/BulkLabelPrinter";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = session?.user?.id;

    if (!session?.user || (userRole !== 'ADMIN' && userRole !== 'VENDOR')) {
        redirect('/');
    }

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

    // Check ownership for vendors
    let vendorSubtotal = 0;
    if (userRole === 'VENDOR') {
        const hasVendorProduct = order.items.some((item: any) => item.vendorId === userId);
        if (!hasVendorProduct) {
            redirect('/admin/orders');
        }
        // Filter items to only show vendor's products
        order.items = order.items.filter((item: any) => item.vendorId === userId);
        vendorSubtotal = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }

    const safeOrder = JSON.parse(JSON.stringify(order));

    const statusMap: Record<string, { label: string, color: string }> = {
        'PENDING': { label: 'Kutilmoqda', color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
        'PROCESSING': { label: 'Jarayonda', color: 'bg-blue-50 text-blue-700 border-blue-100' },
        'SHIPPING': { label: 'Yetkazilmoqda', color: 'bg-purple-50 text-purple-700 border-purple-100' },
        'DELIVERED': { label: 'Yetkazildi', color: 'bg-green-50 text-green-700 border-green-100' },
        'CANCELLED': { label: 'Bekor qilindi', color: 'bg-red-50 text-red-700 border-red-100' },
    };

    const status = statusMap[order.status] || { label: order.status, color: 'bg-gray-50 text-gray-700 border-gray-100' };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-5">
                    <Link href="/admin/orders" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 text-gray-400 hover:text-blue-600 hover:bg-white hover:border-blue-100 transition-all group">
                        <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Buyurtma <span className="text-blue-600">#{order.id.slice(-6).toUpperCase()}</span></h1>
                            <span className={`px-4 py-1 rounded-full text-xs font-bold border transition-colors ${status.color}`}>
                                {status.label}
                            </span>
                        </div>
                        <div className="flex gap-4 mt-2 text-sm text-gray-500 font-medium">
                            <span className="flex items-center gap-1.5"><Calendar size={14} className="text-gray-400" /> {new Date(order.createdAt).toLocaleString('uz-UZ')}</span>
                            <span className="flex items-center gap-1.5"><CreditCard size={14} className="text-gray-400" /> {order.paymentMethod}</span>
                        </div>
                    </div>
                </div>
                <div className="w-full md:w-auto flex items-center gap-3">
                    <BulkLabelPrinter orders={[safeOrder]} />
                    <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Order Items */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
                        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2.5">
                                <Package size={20} className="text-blue-500" />
                                Buyurtma tarkibi
                                <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">{order.items.length} dona</span>
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {order.items.map((item: any) => (
                                <div key={item.id} className="p-6 flex items-center gap-6 hover:bg-gray-50/30 transition-colors">
                                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0 group">
                                        {item.product.image ? (
                                            <img src={item.product.image} alt={item.product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-200"><Package size={32} /></div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-gray-900 truncate">{item.product.title}</h4>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className="text-sm font-semibold text-blue-600">{item.product.price.toLocaleString()} so'm</span>
                                            <span className="text-xs text-gray-400">×</span>
                                            <span className="text-sm font-medium text-gray-500">{item.quantity} dona</span>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="font-extrabold text-gray-900">{(item.product.price * item.quantity).toLocaleString()} <span className="text-[10px] text-gray-400 font-bold uppercase ml-0.5">so'm</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 bg-gray-50/50 space-y-3 border-t border-gray-100">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">{userRole === 'VENDOR' ? 'Sizning mahsulotlaringiz:' : 'Mahsulotlar:'}</span>
                                <span className="font-bold text-gray-900">{userRole === 'VENDOR' ? vendorSubtotal.toLocaleString() : (order.total - ((order as any).deliveryFee || 0) + ((order as any).discountAmount || 0)).toLocaleString()} so'm</span>
                            </div>
                            {userRole !== 'VENDOR' && (
                                <>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 font-medium">Yetkazib berish:</span>
                                        <span className={((order as any).deliveryFee || 0) === 0 ? "font-bold text-green-600" : "font-bold text-gray-900"}>
                                            {((order as any).deliveryFee || 0) === 0 ? "Bepul" : `${(order as any).deliveryFee.toLocaleString()} so'm`}
                                        </span>
                                    </div>
                                    {((order as any).discountAmount || 0) > 0 && (
                                        <div className="flex justify-between items-center text-sm text-emerald-600">
                                            <span className="font-medium flex items-center gap-2">
                                                <Tag size={14} />
                                                Chegirma {(order as any).couponCode ? `(${(order as any).couponCode})` : ''}:
                                            </span>
                                            <span className="font-black">-{((order as any).discountAmount || 0).toLocaleString()} so'm</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="p-6 bg-gray-900 text-white">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 font-medium">{userRole === 'VENDOR' ? 'Sizning ulushingiz (taxminiy):' : 'Jami to\'lov miqdori:'}</span>
                                <span className="text-2xl font-black text-white">{userRole === 'VENDOR' ? vendorSubtotal.toLocaleString() : order.total.toLocaleString()} <span className="text-sm font-bold opacity-60 ml-1">UZS</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Customer & Info */}
                <div className="space-y-8">
                    {/* Customer Info */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 transition-all hover:shadow-md">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2.5">
                            <User size={18} className="text-blue-500" /> Mijoz ma'lumotlari
                        </h3>
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-blue-100 ring-4 ring-white">
                                {order.user.name?.[0] || 'U'}
                            </div>
                            <div className="min-w-0">
                                <p className="font-extrabold text-gray-900 truncate">{order.user.name || 'Nomsiz'}</p>
                                <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">{order.user.email}</p>
                            </div>
                        </div>
                        <div className="space-y-3 px-1">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400 font-medium flex items-center gap-2">📞 Telefon</span>
                                <span className="font-bold text-gray-900">{order.user.phone || '---'}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400 font-medium flex items-center gap-2">🆔 Foydalanuvchi ID</span>
                                <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase">{order.user.uniqueId || '---'}</span>
                            </div>
                        </div>
                        <Link href={`/admin/users/${order.user.id}`} className="block w-full text-center py-2.5 rounded-xl border border-gray-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 shadow-sm transition-all text-sm font-bold">
                            Profilni ko'rish
                        </Link>
                    </div>

                    {/* Shipping Address */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 transition-all hover:shadow-md">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2.5">
                            <MapPin size={18} className="text-green-500" /> Yetkazib berish
                        </h3>
                        {order.shippingAddress || order.shippingCity ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-50/30 rounded-xl border border-green-100 text-sm">
                                    <p className="font-extrabold text-gray-900">{order.shippingCity}, {order.shippingDistrict}</p>
                                    <p className="text-gray-600 mt-1 leading-relaxed">{order.shippingAddress}</p>
                                </div>
                                <div className="space-y-2 px-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400 font-medium italic">Qabul qiluvchi:</span>
                                        <span className="font-bold text-gray-900">{order.shippingName}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400 font-medium italic">Telefon:</span>
                                        <span className="font-bold text-gray-900 font-mono tracking-tighter">{order.shippingPhone}</span>
                                    </div>
                                </div>
                                {order.comment && (
                                    <div className="p-4 bg-yellow-50/50 rounded-xl border border-yellow-100/50 relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400"></div>
                                        <span className="text-[10px] uppercase font-black text-yellow-600 block mb-1.5 opacity-70">Mijoz izohi:</span>
                                        <p className="text-xs text-yellow-900 leading-relaxed font-medium italic">"{order.comment}"</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs italic">
                                Manzil ma'lumotlari kiritilmagan
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

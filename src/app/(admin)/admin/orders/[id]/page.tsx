
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin, User, Package, Calendar, CreditCard, ChevronDown, Tag, Truck, Image as ImageIcon } from "lucide-react";
import OrderStatusSelect from "../OrderStatusSelect";
import CourierSelector from "@/components/admin/CourierSelector";
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

    // Fetch order basics using raw SQL to bypass client validation
    const orders: any[] = await prisma.$queryRawUnsafe(
        'SELECT * FROM "Order" WHERE id = $1 LIMIT 1',
        id
    );
    const orderBasics = orders[0];
    if (!orderBasics) notFound();

    // Manually fetch relations
    const [customer, items] = await Promise.all([
        prisma.user.findUnique({ where: { id: orderBasics.userId } }),
        prisma.orderItem.findMany({
            where: { orderId: id },
            include: { product: true }
        }),
    ]);

    let courier = null;
    if (orderBasics.courierId) {
        try {
            const couriersRaw: any[] = await prisma.$queryRawUnsafe(
                'SELECT * FROM "User" WHERE id = $1 LIMIT 1',
                orderBasics.courierId
            );
            if (couriersRaw.length > 0) {
                courier = couriersRaw[0];
                const profilesRaw: any[] = await prisma.$queryRawUnsafe(
                    'SELECT * FROM "CourierProfile" WHERE "userId" = $1 LIMIT 1',
                    courier.id
                );
                courier.courierProfile = profilesRaw[0] || null;
            }
        } catch (e) {
            console.error("Manual courier fetch error:", e);
        }
    }

    const order = {
        ...orderBasics,
        user: customer,
        items: items,
        courier: courier
    };

    if (!order) notFound();

    // Check ownership for vendors
    let vendorSubtotal = 0;
    const orderItems = (order as any).items || [];
    if (userRole === 'VENDOR') {
        const hasVendorProduct = orderItems.some((item: any) => item.vendorId === userId);
        if (!hasVendorProduct) {
            redirect('/admin/orders');
        }
        // Filter items to only show vendor's products
        (order as any).items = orderItems.filter((item: any) => item.vendorId === userId);
        vendorSubtotal = (order as any).items.reduce((acc: any, item: any) => acc + (item.price * item.quantity), 0);
    }

    const safeOrder = JSON.parse(JSON.stringify(order));

    const statusMap: Record<string, { label: string, color: string }> = {
        'CREATED': { label: 'Kutilmoqda', color: 'bg-amber-50 text-amber-700 border-amber-100' },
        'ASSIGNED': { label: 'Tayinlangan', color: 'bg-blue-50 text-blue-700 border-blue-100' },
        'PROCESSING': { label: 'Yig\'ilyabdi', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
        'DELIVERING': { label: 'Yetkazilmoqda', color: 'bg-purple-50 text-purple-700 border-purple-100' },
        'DELIVERED': { label: 'Yetkazildi', color: 'bg-green-50 text-green-700 border-green-100' },
        'COMPLETED': { label: 'Yakunlandi', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
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
                            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Buyurtma <span className="text-blue-600">#{(order as any).id.slice(-6).toUpperCase()}</span></h1>
                            <span className={`px-4 py-1 rounded-full text-xs font-bold border transition-colors ${status.color}`}>
                                {status.label}
                            </span>
                        </div>
                        <div className="flex gap-4 mt-2 text-sm text-gray-500 font-medium">
                            <span className="flex items-center gap-1.5"><Calendar size={14} className="text-gray-400" /> {new Date((order as any).createdAt).toLocaleString('uz-UZ')}</span>
                            <span className="flex items-center gap-1.5"><CreditCard size={14} className="text-gray-400" /> {(order as any).paymentMethod}</span>
                        </div>
                    </div>
                </div>
                <div className="w-full md:w-auto flex items-center gap-3">
                    <BulkLabelPrinter orders={[safeOrder]} />
                    {userRole === 'ADMIN' && (
                        <CourierSelector
                            orderId={(order as any).id}
                            currentCourierId={(order as any).courierId || undefined}
                            orderStatus={(order as any).status}
                        />
                    )}
                    <OrderStatusSelect orderId={(order as any).id} currentStatus={(order as any).status} />
                </div>
            </div>

            {/* Left Column: Order Items & Delivery Context */}
            <div className="lg:col-span-2 space-y-8">
                {/* Order Items Table Card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
                    <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2.5">
                            <Package size={20} className="text-blue-500" />
                            Buyurtma tarkibi
                            <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">{(order as any).items.length} dona</span>
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto custom-scrollbar">
                        {(order as any).items.map((item: any) => (
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
                            <span className="font-bold text-gray-900">{userRole === 'VENDOR' ? vendorSubtotal.toLocaleString() : ((order as any).total - ((order as any).deliveryFee || 0) + ((order as any).discountAmount || 0)).toLocaleString()} so'm</span>
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
                            <span className="text-2xl font-black text-white">{userRole === 'VENDOR' ? vendorSubtotal.toLocaleString() : (order as any).total.toLocaleString()} <span className="text-sm font-bold opacity-60 ml-1">UZS</span></span>
                        </div>
                    </div>
                </div>

                {/* TWO COLUMN GRID FOR ADDRESS & COURIER */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Shipping Address */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 transition-all hover:shadow-md h-full">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2.5 text-sm">
                            <MapPin size={18} className="text-emerald-500" /> O'rnatilgan manzil
                        </h3>
                        {(order as any).shippingAddress || (order as any).shippingCity ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-emerald-50/20 rounded-xl border border-emerald-100/50">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded uppercase">{(order as any).shippingCity}</span>
                                        <span className="text-xs font-bold text-gray-400">/</span>
                                        <span className="text-xs font-bold text-gray-900">{(order as any).shippingDistrict}</span>
                                    </div>
                                    <p className="text-xs text-gray-700 font-medium leading-relaxed">{(order as any).shippingAddress}</p>
                                </div>
                                <div className="space-y-3 px-1">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400 font-bold uppercase tracking-tighter">Qabul qiluvchi</span>
                                        <span className="font-bold text-gray-900">{(order as any).shippingName}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400 font-bold uppercase tracking-tighter">Telefon</span>
                                        <span className="font-bold text-gray-900 font-mono">{(order as any).shippingPhone}</span>
                                    </div>
                                </div>
                                {(order as any).comment && (
                                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                                        <p className="text-[11px] text-amber-900 font-medium italic leading-relaxed">"{(order as any).comment}"</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs italic">
                                Manzil ma'lumotlari mavjud emas
                            </div>
                        )}
                    </div>

                    {/* Courier Info */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 transition-all hover:shadow-md h-full border-l-4 border-l-blue-500">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2.5 text-sm">
                            <Truck size={18} className="text-blue-500" /> Biriktirilgan Kuryer
                        </h3>
                        {(order as any).courier ? (
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 p-3 bg-blue-50/30 rounded-xl border border-blue-100">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black">
                                        {(order as any).courier.name?.[0] || 'K'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{(order as any).courier.name}</p>
                                        <p className="text-xs text-gray-500">{(order as any).courier.phone || 'Telefon raqamsiz'}</p>
                                    </div>
                                </div>
                                <div className="px-1 space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400 uppercase font-bold tracking-tighter">Kuryer holati</span>
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">
                                            {(order as any).courier.courierProfile?.status || 'ONLINE'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-100 text-gray-400 text-xs italic">
                                Kuryer tayinlanmagan
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Customer & Delivery Proof */}
            <div className="space-y-8">
                {/* Customer Info */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2.5">
                            <User size={18} className="text-blue-500" /> Mijoz
                        </h3>
                        <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase tracking-tighter">
                            {(order as any).user.uniqueId || '---'}
                        </span>
                    </div>

                    <div className="flex items-center gap-4 p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-black shadow-lg shadow-blue-100 ring-2 ring-white">
                            {(order as any).user.name?.[0] || 'U'}
                        </div>
                        <div className="min-w-0">
                            <p className="font-extrabold text-gray-900 truncate">{(order as any).user.name || 'Nomsiz'}</p>
                            <p className="text-[11px] text-gray-500 font-medium truncate">{(order as any).user.email}</p>
                        </div>
                    </div>

                    <div className="space-y-4 px-1">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Telefon</span>
                            <span className="font-bold text-gray-900">{(order as any).user.phone || '---'}</span>
                        </div>
                        <Link href={`/admin/users/${(order as any).user.id}`} className="block w-full text-center py-2.5 rounded-xl bg-gray-900 text-white hover:bg-black shadow-lg transition-all text-[11px] font-black uppercase tracking-wider">
                            Profilni ko'rish
                        </Link>
                    </div>
                </div>

                {/* Delivery Photo (Proof) - HIGHER PRIORITY NOW */}
                {(order as any).deliveryPhoto && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 transition-all hover:shadow-md border-l-4 border-l-green-500">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2.5">
                            <ImageIcon size={18} className="text-green-500" /> Yetkazib berish tasdig'i
                        </h3>
                        <div className="relative aspect-auto min-h-[180px] w-full rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 group shadow-inner">
                            <a
                                href={`/api/admin/telegram-photo/${(order as any).deliveryPhoto}`}
                                target="_blank"
                                rel="noreferrer"
                                className="block w-full h-full"
                            >
                                <img
                                    src={`/api/admin/telegram-photo/${(order as any).deliveryPhoto}`}
                                    alt="Delivery Proof"
                                    className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <span className="text-white text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">Kattalashtirish</span>
                                </div>
                            </a>
                        </div>
                        <div className="flex items-center justify-center gap-2 p-2 bg-green-50 rounded-lg">
                            <Package size={14} className="text-green-600" />
                            <span className="text-[10px] text-green-700 font-bold uppercase tracking-tight">Topshirilgan rasm</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

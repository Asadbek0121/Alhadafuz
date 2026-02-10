import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Printer, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PrintButton from "./PrintButton";

export default async function ViewInvoicePage({ params }: { params: Promise<{ id: string }> }) {
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

    const settings = await (prisma as any).storeSettings.findUnique({ where: { id: 'default' } });

    const statusMap: Record<string, { label: string, color: string, bg: string }> = {
        'PENDING': { label: 'Kutilmoqda', color: '#d97706', bg: '#fef3c7' },
        'AWAITING_PAYMENT': { label: 'To\'lov kutilmoqda', color: '#b45309', bg: '#fffbeb' },
        'PROCESSING': { label: 'Jarayonda', color: '#2563eb', bg: '#dbeafe' },
        'SHIPPING': { label: 'Yetkazilmoqda', color: '#7c3aed', bg: '#ede9fe' },
        'DELIVERED': { label: 'Yetkazildi', color: '#059669', bg: '#d1fae5' },
        'CANCELLED': { label: 'Bekor qilindi', color: '#dc2626', bg: '#fee2e2' },
    };

    const status = statusMap[order.status] || { label: order.status, color: '#4b5563', bg: '#f3f4f6' };

    return (
        <div className="max-w-4xl mx-auto">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    /* Hide sidebar, header, and other layout elements */
                    aside, nav, header, .no-print, [role="navigation"], .sidebar, .navbar { 
                        display: none !important; 
                    }
                    
                    /* Reset body styles for printing */
                    body { 
                        background: white !important; 
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        position: static !important;
                    }

                    /* Ensure main content container takes full width */
                    main, .main-content {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        position: static !important;
                        background: white !important;
                    }

                    .print-area { 
                        display: block !important;
                        box-shadow: none !important; 
                        border: none !important; 
                        padding: 1cm !important; 
                        margin: 0 !important;
                        width: 100% !important;
                        transform: scale(1) !important;
                    }

                    /* Fix for potential page break issues */
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    
                    @page {
                        margin: 1.5cm;
                        size: auto;
                    }
                }
            `}} />

            <div className="no-print flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin/invoices">
                        <Button variant="outline" size="icon" className="rounded-full">
                            <ArrowLeft size={18} />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold">Hisob-faktura #{order.id.slice(-6).toUpperCase()}</h1>
                </div>
                <div className="flex gap-2">
                    <PrintButton />
                    <Link href={`/admin/orders/${order.id}`}>
                        <Button className="bg-blue-600 hover:bg-blue-700">Tafsilotlar</Button>
                    </Link>
                </div>
            </div>

            <div className="print-area bg-white rounded-2xl border border-gray-100 shadow-xl p-10 md:p-16 space-y-12">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-3xl font-black text-blue-600 mb-2">{settings?.siteName || "Hadaf Market"}</div>
                        <p className="text-gray-500 text-sm max-w-xs">Sifatli mahsulotlar va ishonchli xizmat ko'rsatish markazi</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-4xl font-black text-gray-900 uppercase">Invoys</h2>
                        <div className="mt-2 flex flex-col items-end">
                            <span className="text-sm font-bold text-gray-400">ID: <span className="text-gray-900">#{order.id.toUpperCase()}</span></span>
                            <span className="text-sm font-bold text-gray-400">SANA: <span className="text-gray-900">{new Date(order.createdAt).toLocaleDateString()}</span></span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-12">
                    <div>
                        <h4 className="text-[10px] uppercase font-black text-gray-400 mb-4 tracking-widest">KIMDAN (BILL FROM)</h4>
                        <div className="text-sm space-y-1">
                            <p className="font-bold text-gray-900 text-lg">{settings?.siteName || "Hadaf Market"} MCHJ</p>
                            <p className="text-gray-600">{settings?.address || "Termiz sh, At-Termiziy ko'chasi"}</p>
                            <p className="text-gray-600">{settings?.email || "info@hadaf.uz"}</p>
                            <p className="text-gray-600 font-bold">{settings?.phone || "+998 71 200 01 05"}</p>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-[10px] uppercase font-black text-gray-400 mb-4 tracking-widest">KIMGA (BILL TO)</h4>
                        <div className="text-sm space-y-1">
                            <p className="font-bold text-gray-900 text-lg">{order.user.name || "Mehmon"}</p>
                            <p className="text-gray-600">{order.shippingAddress || "Manzil ko'rsatilmagan"}</p>
                            <p className="text-gray-600">{order.user.email}</p>
                            <p className="text-gray-600 font-bold">{order.shippingPhone || order.user.phone}</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-100">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Mahsulot nomi</th>
                                <th className="px-6 py-4 text-center">Narxi</th>
                                <th className="px-6 py-4 text-center">Miqdori</th>
                                <th className="px-6 py-4 text-right">Jami</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {order.items.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-5">
                                        <div className="font-bold text-gray-900">{item.product.title}</div>
                                        <div className="text-[10px] text-gray-400 font-medium">SKU: {item.productId.slice(-8).toUpperCase()}</div>
                                    </td>
                                    <td className="px-6 py-5 text-center font-medium text-gray-600">
                                        {item.price.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-5 text-center font-medium text-gray-600">
                                        {item.quantity}
                                    </td>
                                    <td className="px-6 py-5 text-right font-black text-gray-900">
                                        {(item.price * item.quantity).toLocaleString()} <span className="text-[10px] text-gray-400 uppercase ml-0.5">uzs</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-between items-center bg-gray-900 text-white p-8 rounded-2xl">
                    <div>
                        <div className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">TO'LOV USULI</div>
                        <div className="font-bold">{order.paymentMethod}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">UMUMIY SUMMA</div>
                        <div className="text-4xl font-black">{order.total.toLocaleString()} <span className="text-sm font-bold opacity-50 ml-1">UZS</span></div>
                    </div>
                </div>

                <div className="pt-12 border-t border-gray-100 text-center">
                    <p className="text-gray-400 text-xs font-medium italic">Xaridingiz uchun rahmat! Savollaringiz bo'lsa, +998 71 200 00 00 raqamiga murojaat qiling.</p>
                </div>
            </div>
        </div>
    );
}

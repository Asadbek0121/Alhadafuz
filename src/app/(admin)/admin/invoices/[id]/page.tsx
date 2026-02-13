import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Printer, ArrowLeft, Download, Phone, Mail, MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PrintButton from "./PrintButton";

export default async function ViewInvoicePage({ params }: { params: Promise<{ id: string }> }) {
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
    if (userRole === 'VENDOR') {
        const hasVendorProduct = order.items.some((item: any) => item.vendorId === userId);
        if (!hasVendorProduct) {
            redirect('/admin/invoices');
        }
        // Filter items to only show vendor's products
        order.items = order.items.filter((item: any) => item.vendorId === userId);
    }

    const settings = await (prisma as any).storeSettings.findUnique({ where: { id: 'default' } });

    const subTotal = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const taxValue = subTotal * 0.15; // 15% as in template
    const grandTotal = subTotal + taxValue;

    return (
        <div className="max-w-4xl mx-auto">
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                
                .print-area {
                    font-family: 'Inter', sans-serif;
                }

                @media print {
                    aside, nav, header, .no-print, [role="navigation"], .sidebar, .navbar { 
                        display: none !important; 
                    }
                    
                    body { 
                        background: white !important; 
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    .main-content {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                    }

                    .print-area { 
                        display: block !important;
                        box-shadow: none !important; 
                        border: none !important; 
                        padding: 0 !important; 
                        margin: 0 !important;
                        width: 100% !important;
                    }

                    .bg-blue-600 { background-color: #2563eb !important; -webkit-print-color-adjust: exact; }
                    .bg-blue-50 { background-color: #eff6ff !important; -webkit-print-color-adjust: exact; }
                    .text-white { color: white !important; -webkit-print-color-adjust: exact; }
                    .text-blue-600 { color: #2563eb !important; -webkit-print-color-adjust: exact; }
                    .text-gray-400 { color: #9ca3af !important; -webkit-print-color-adjust: exact; }
                    .text-gray-500 { color: #6b7280 !important; -webkit-print-color-adjust: exact; }
                    .text-gray-600 { color: #4b5563 !important; -webkit-print-color-adjust: exact; }
                    .text-gray-900 { color: #111827 !important; -webkit-print-color-adjust: exact; }
                    
                    @page {
                        margin: 1cm;
                        size: A4;
                    }
                }
            `}} />

            <div className="no-print flex justify-between items-center mb-6 px-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/invoices">
                        <Button variant="outline" size="icon" className="rounded-full shadow-sm hover:shadow-md transition-shadow">
                            <ArrowLeft size={18} />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold text-gray-800">Hisob-faktura <span className="text-blue-600">#{order.id.slice(-6).toUpperCase()}</span></h1>
                </div>
                <div className="flex gap-3">
                    <PrintButton />
                    <Link href={`/admin/orders/${order.id}`}>
                        <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100">Tafsilotlar</Button>
                    </Link>
                </div>
            </div>

            <div className="print-area bg-white shadow-2xl min-h-[1100px] p-12 relative flex flex-col border border-gray-100 rounded-sm">
                {/* Header */}
                <div className="flex justify-between items-end mb-4 px-2">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-200">
                            <div className="w-9 h-9 border-[3.5px] border-white rounded-full border-t-transparent origin-center"></div>
                        </div>
                        <div>
                            <div className="text-2xl font-black text-gray-900 leading-tight uppercase tracking-tighter">
                                {settings?.siteName || "HADAF MARKET"}
                            </div>
                            <div className="text-[11px] font-extrabold text-blue-600 uppercase tracking-[0.2em] mt-0.5">
                                Savdo va Logistika Markazi
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-6xl font-black text-blue-600 tracking-tighter mb-1 select-none">INVOICE</h2>
                        <div className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">
                            WWW.HADAF.UZ
                        </div>
                    </div>
                </div>

                <div className="w-full h-[2.5px] bg-blue-600 mb-14 opacity-10 rounded-full"></div>

                {/* Recipient and Meta info */}
                <div className="flex justify-between mb-20 px-4">
                    <div className="relative">
                        <div className="absolute -left-4 top-0 w-1 h-full bg-blue-600 rounded-full opacity-20"></div>
                        <div className="text-[11px] font-black text-gray-400 uppercase mb-3 tracking-widest">Invoice to :</div>
                        <div className="text-3xl font-black text-gray-900 mb-3 tracking-tight">{order.user.name || order.shippingName || "Mehmon Foydalanuvchi"}</div>
                        <div className="text-[13px] font-semibold text-gray-500 space-y-1">
                            <p className="flex items-center gap-2 tracking-tight"> {order.shippingPhone || order.user.phone || "Telefon ko'rsatilmagan"}</p>
                            <p className="flex items-center gap-2 tracking-tight"> {order.user.email || "Email ko'rsatilmagan"}</p>
                            <p className="max-w-xs leading-relaxed mt-1 opacity-80">{order.shippingAddress || "Yetkazib berish manzili ko'rsatilmagan"}</p>
                        </div>
                    </div>
                    <div className="text-right flex flex-col justify-center">
                        <div className="mb-4">
                            <div className="text-[11px] font-black text-gray-400 uppercase mb-1 tracking-widest">Invoice no :</div>
                            <div className="text-2xl font-black text-gray-900 tracking-tight">#{order.id.slice(-6).toUpperCase()}</div>
                        </div>
                        <div>
                            <div className="text-[11px] font-black text-gray-400 uppercase mb-1 tracking-widest">Date :</div>
                            <div className="text-sm font-black text-gray-800 uppercase">{new Date(order.createdAt).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-grow px-2">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-blue-600 text-white uppercase text-[11px] font-black tracking-[0.15em] shadow-sm">
                                <th className="py-4 px-5 text-left rounded-l-md font-black">NO</th>
                                <th className="py-4 px-5 text-left font-black">DESCRIPTION</th>
                                <th className="py-4 px-5 text-center font-black">QTY</th>
                                <th className="py-4 px-5 text-center font-black">PRICE (UZS)</th>
                                <th className="py-4 px-5 text-right rounded-r-md font-black">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {order.items.map((item: any, index: number) => (
                                <tr key={item.id} className={index % 2 === 1 ? 'bg-blue-50/20' : ''}>
                                    <td className="py-5 px-5 text-[13px] font-black text-gray-400">{index + 1}</td>
                                    <td className="py-5 px-5 text-[14px] font-bold text-gray-900 leading-snug">
                                        {item.product.title}
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">ID: {item.productId.slice(-8)}</div>
                                    </td>
                                    <td className="py-5 px-5 text-[14px] font-black text-gray-900 text-center font-mono">{item.quantity}</td>
                                    <td className="py-5 px-5 text-[14px] font-bold text-gray-900 text-center font-mono opacity-80">{item.price.toLocaleString()}</td>
                                    <td className="py-5 px-5 text-[14px] font-black text-gray-900 text-right font-mono tracking-tighter">{(item.price * item.quantity).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals and Payment */}
                <div className="mt-12 flex justify-between items-start px-2">
                    <div className="w-[45%]">
                        <div className="bg-blue-600 text-white inline-block px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] mb-5 rounded-sm shadow-md shadow-blue-50">
                            PAYMENT METHOD :
                        </div>
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-2 group">
                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full opacity-40 group-hover:opacity-100 transition-opacity"></div>
                                <span className="text-[13px] font-black text-gray-500 uppercase tracking-tight w-24">TO'LOV TURI:</span>
                                <span className="text-[13px] font-bold text-gray-900 uppercase tracking-tight">{order.paymentMethod}</span>
                            </div>
                            <div className="flex items-center gap-2 group">
                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full opacity-40 group-hover:opacity-100 transition-opacity"></div>
                                <span className="text-[13px] font-black text-gray-500 uppercase tracking-tight w-24">HOLATI:</span>
                                <span className="text-[13px] font-bold text-blue-600 uppercase tracking-tight">{order.paymentStatus}</span>
                            </div>
                            <div className="pt-8 ml-3">
                                <p className="text-[15px] font-black text-gray-900 leading-tight tracking-tight uppercase italic opacity-90 shadow-sm inline-block">Thank you for business with us!</p>
                            </div>
                        </div>
                    </div>

                    <div className="w-[45%] flex flex-col items-end space-y-4">
                        <div className="w-full flex justify-between items-center px-4 py-1">
                            <span className="text-[13px] font-black text-gray-400 uppercase tracking-widest">SUB TOTAL :</span>
                            <span className="text-[15px] font-black text-gray-900 font-mono tracking-tighter">{subTotal.toLocaleString()}</span>
                        </div>
                        <div className="w-full flex justify-between items-center px-4 py-1">
                            <span className="text-[13px] font-black text-gray-400 uppercase tracking-widest">TAX 15% :</span>
                            <span className="text-[15px] font-black text-gray-900 font-mono tracking-tighter">{taxValue.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-blue-600 text-white rounded-md p-5 flex justify-between items-center shadow-2xl shadow-blue-100 ring-4 ring-blue-50">
                            <span className="text-[12px] font-black uppercase tracking-[0.3em]">GRAND TOTAL :</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black font-mono tracking-tighter">{(subTotal + taxValue).toLocaleString()}</span>
                                <span className="text-[10px] font-black opacity-60">UZS</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Terms and Signatory */}
                <div className="mt-20 flex justify-between items-end px-4">
                    <div className="max-w-[400px]">
                        <div className="text-[11px] font-black text-gray-900 uppercase mb-3 tracking-[0.15em]">Terms and Conditions :</div>
                        <div className="text-[10.5px] leading-relaxed text-gray-400 font-medium italic opacity-80 border-l-2 border-gray-100 pl-4 py-1">
                            Ushbu hisob-faktura rasmiy hujjat hisoblanadi. To'lov 30 kun ichida amalga oshirilishi lozim.
                            Kechikkan to'lovlar uchun har oy 10% miqdorida jarima qo'llanilishi mumkin.
                            Mahsulot sifati bo'yicha e'tirozlar 24 soat ichida ko'rib chiqiladi.
                        </div>
                    </div>
                    <div className="text-center group">
                        <div className="font-serif text-3xl italic text-gray-200 mb-2 opacity-30 select-none transform transition-transform group-hover:scale-105">Hadaf Market Digital</div>
                        <div className="w-40 h-[1.5px] bg-gray-100 mx-auto mb-3 rounded-full"></div>
                        <div className="text-[14px] font-black text-gray-900 tracking-tight">Authorized Administrator</div>
                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mt-1">Hadaf Market LLC</div>
                    </div>
                </div>

                {/* Footer bar */}
                <div className="mt-auto pt-16">
                    <div className="w-full h-[0.5px] bg-gray-100 mb-8 px-4"></div>
                    <div className="grid grid-cols-3 gap-6 px-4 pb-6">
                        <div className="flex items-center gap-4 group">
                            <div className="w-10 h-10 rounded-full border border-blue-100 flex items-center justify-center text-blue-600 bg-blue-50/30 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                <Phone size={16} />
                            </div>
                            <span className="text-[12px] font-black text-gray-700 tracking-tighter">{settings?.phone || "+998 71 200 01 05"}</span>
                        </div>
                        <div className="flex items-center gap-4 group justify-center">
                            <div className="w-10 h-10 rounded-full border border-blue-100 flex items-center justify-center text-blue-600 bg-blue-50/30 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                <Mail size={16} />
                            </div>
                            <span className="text-[12px] font-black text-gray-700 tracking-tighter truncate max-w-[150px]">{settings?.email || "info@hadaf.uz"}</span>
                        </div>
                        <div className="flex items-center gap-4 group justify-end">
                            <div className="w-10 h-10 rounded-full border border-blue-100 flex items-center justify-center text-blue-600 bg-blue-50/30 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                <MapPin size={16} />
                            </div>
                            <span className="text-[12px] font-black text-gray-700 tracking-tighter text-right leading-tight max-w-[150px]">{settings?.address || "Termiz, Surxondaryo"}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

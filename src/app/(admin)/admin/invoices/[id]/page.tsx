import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Printer, ArrowLeft, Download, Phone, Mail, MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PrintButton from "./PrintButton";
import InvoiceTemplate from "@/components/Invoice/InvoiceTemplate";

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
    const clickMethod = await (prisma as any).paymentMethod.findFirst({
        where: { provider: 'CLICK', isActive: true }
    });

    const subTotal = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const grandTotal = subTotal;

    return (
        <div className="max-w-4xl mx-auto">
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@900&family=Inter:wght@400;500;600;700;800;900&display=swap');
                
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
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    .main-content {
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    .print-area {
                        display: block !important;
                        width: 100% !important;
                        min-height: auto !important;
                        padding: 10mm !important;
                        box-shadow: none !important;
                        border: none !important;
                    }

                    .print-area * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    @page {
                        size: A4;
                        margin: 5mm;
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

            <div className="bg-white shadow-2xl min-h-[1100px] p-12 relative flex flex-col border border-gray-100 rounded-sm overflow-hidden">
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@900&family=Inter:wght@400;500;600;700;800;900&display=swap');
                    
                    .invoice-container { font-family: 'Inter', sans-serif; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #eff6ff; padding-bottom: 30px; }
                    .brand { display: flex; align-items: center; gap: 20px; }
                    .logo { width: 100px; height: 100px; object-fit: contain; }
                    .brand-text h1 { font-family: 'Montserrat', sans-serif; font-size: 56px; font-weight: 900; color: #0052FF; margin: 0; line-height: 0.8; text-transform: uppercase; }
                    .brand-text .market { font-family: 'Montserrat', sans-serif; font-size: 20px; font-weight: 900; color: #0052FF; text-transform: uppercase; margin-top: 4px; display: block; }
                    .tagline { font-size: 10px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.4em; margin-top: 15px; }
                    .invoice-label h2 { font-size: 64px; font-weight: 900; color: #0052FF; margin: 0; line-height: 0.8; text-align: right; }
                    .domain { font-size: 13px; font-weight: 900; color: #6b7280; text-transform: uppercase; letter-spacing: 0.4em; text-align: right; margin-top: 10px; }
                    .info-section { display: flex; justify-content: space-between; margin-bottom: 50px; }
                    .bill-to h3 { font-size: 11px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 12px; }
                    .customer-name { font-size: 32px; font-weight: 900; color: #111827; margin-bottom: 15px; }
                    .customer-details { font-size: 14px; font-weight: 600; color: #4b5563; line-height: 1.6; }
                    .invoice-meta { text-align: right; }
                    .meta-item { margin-bottom: 20px; }
                    .meta-label { font-size: 11px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 5px; }
                    .meta-value { font-size: 20px; font-weight: 900; color: #111827; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                    th { background: #2563eb; color: white; text-transform: uppercase; font-size: 11px; font-weight: 900; padding: 18px 20px; text-align: left; letter-spacing: 0.15em; }
                    td { padding: 20px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; }
                    .totals-section { display: flex; justify-content: space-between; margin-top: 40px; }
                    .payment-info h4 { background: #2563eb; color: white; display: inline-block; padding: 8px 18px; font-size: 11px; font-weight: 900; border-radius: 4px; margin-bottom: 25px; }
                    .payment-item { font-size: 14px; margin-bottom: 12px; display: flex; gap: 10px; }
                    .thanks-text { margin-top: 40px; font-size: 16px; font-weight: 900; font-style: italic; text-transform: uppercase; color: #111827; }
                    .totals-calc { width: 300px; }
                    .calc-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; font-weight: 900; color: #9ca3af; }
                    .calc-value { color: #111827; }
                    .grand-total-box { background: #2563eb; color: white; padding: 25px; border-radius: 10px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center; }
                    .total-label { font-size: 12px; font-weight: 900; letter-spacing: 0.3em; }
                    .total-amount { font-size: 28px; font-weight: 900; }
                    .footer { margin-top: auto; padding-top: 40px; border-top: 2px solid #f3f4f6; }
                    .footer-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; }
                    .footer-item { display: flex; align-items: center; gap: 12px; font-size: 13px; font-weight: 900; color: #4b5563; }
                `}} />

                <InvoiceTemplate
                    order={order}
                    settings={settings}
                    subTotal={subTotal}
                    grandTotal={grandTotal}
                    clickMethod={clickMethod}
                />
            </div>
        </div>
    );
}

"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function PrintButton() {
    const handlePrint = () => {
        const printUrl = window.location.href.replace('/admin/invoices/', '/print/invoice/');
        window.open(printUrl, '_blank');
    };

    return (
        <Button variant="outline" onClick={handlePrint} className="gap-2 no-print shadow-sm hover:bg-gray-50 transition-all active:scale-95">
            <Printer size={16} /> Chop etish
        </Button>
    );
}

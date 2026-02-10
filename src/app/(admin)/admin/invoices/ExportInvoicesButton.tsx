"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function ExportInvoicesButton({ data }: { data: any[] }) {
    const handleExport = () => {
        if (!data || data.length === 0) return;

        const headers = ["ID", "Mijoz", "Email", "Telefon", "Summa", "Holat", "Sana"];
        const rows = data.map(inv => [
            inv.id,
            inv.user.name || "Noma'lum",
            inv.user.email || "",
            inv.user.phone || "",
            inv.total,
            inv.status,
            new Date(inv.createdAt).toLocaleDateString()
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `invoyslar_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-semibold gap-2"
            onClick={handleExport}
        >
            <Download size={14} /> Eksport (CSV)
        </Button>
    );
}

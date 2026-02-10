"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function PrintButton() {
    return (
        <Button variant="outline" onClick={() => window.print()} className="gap-2 no-print shadow-sm hover:bg-gray-50 transition-all active:scale-95">
            <Printer size={16} /> Chop etish
        </Button>
    );
}

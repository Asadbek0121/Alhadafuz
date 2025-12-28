"use client";

import { generateClickUrl } from "@/lib/click";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface ClickButtonProps {
    amount: number;
    transactionId: string;
    serviceId: string;
    merchantId: string;
    className?: string;
}

export const ClickButton = ({
    amount,
    transactionId,
    serviceId,
    merchantId,
    className
}: ClickButtonProps) => {
    const handlePayment = () => {
        const url = generateClickUrl(serviceId, merchantId, transactionId, amount);
        window.location.href = url;
    };

    return (
        <Button onClick={handlePayment} className={`bg-blue-600 hover:bg-blue-700 text-white ${className}`}>
            CLICK orqali to'lash
            <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
    );
};

"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import { buildClickPayUrl, getClickConfig } from "@/lib/click";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";

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
    const [loading, setLoading] = useState(false);

    const handlePayment = async () => {
        setLoading(true);
        try {
            // Config ni DB dan olish — buildClickPayUrl test mode ni avtomatik hisobga oladi
            const config = await getClickConfig();
            if (!config) {
                alert("To'lov tizimi sozlanmagan. Iltimos, admin bilan bog'laning.");
                return;
            }
            const url = buildClickPayUrl(config, transactionId, amount);
            window.location.href = url;
        } catch (err) {
            console.error("[click] Payment error:", err);
            alert("To'lov sahifasiga o'tishda xatolik yuz berdi.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handlePayment}
            disabled={loading}
            className={`bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 ${className}`}
        >
            {loading ? (
                <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    Yo'naltirilmoqda...
                </>
            ) : (
                <>
                    CLICK orqali to'lash
                    <ExternalLink className="ml-2 h-4 w-4" />
                </>
            )}
        </Button>
    );
};

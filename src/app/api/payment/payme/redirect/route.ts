/**
 * Payme redirect checkout endpoint
 * POST/GET — foydalanuvchini Payme to'lov sahifasiga yo'naltiradi
 */

import { NextRequest, NextResponse } from "next/server";
import { getPaymeConfig, buildPaymeRedirectUrl } from "@/lib/payme";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
    return handleRedirect(req);
}

export async function POST(req: NextRequest) {
    return handleRedirect(req);
}

async function handleRedirect(req: NextRequest): Promise<NextResponse> {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const searchParams = req.nextUrl.searchParams;
    const orderId = searchParams.get("order_id");
    const amount = searchParams.get("amount");
    const lang = searchParams.get("lang") ?? "uz";

    if (!orderId || !amount) {
        return NextResponse.json(
            { error: "order_id va amount majburiy" },
            { status: 400 }
        );
    }

    const config = await getPaymeConfig("production");
    if (!config) {
        return NextResponse.json(
            { error: "Payme config topilmadi" },
            { status: 503 }
        );
    }

    const callbackUrl = `${url.origin}/api/payment/payme/callback`;
    const redirectUrl = buildPaymeRedirectUrl(config, orderId, parseFloat(amount), {
        lang: lang as "ru" | "uz" | "en",
        callback: callbackUrl,
    });

    // GET — to'g'ridan-to'g'ri redirect
    if (req.method === "GET") {
        return NextResponse.redirect(redirectUrl);
    }

    // POST — JSON qaytarish
    return NextResponse.json({ redirectUrl });
}

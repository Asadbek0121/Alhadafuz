/**
 * Payme callback handler (redirect checkout orqali to'lov tugaganidan keyin)
 * Payme foydalanuvchini shu URL ga yo'naltiradi to'lovdan keyin
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const orderId = searchParams.get("order_id") ?? "";

    // To'lov sahifasidan qaytganda — order-success ga yo'naltiramiz
    // Bu yerda Payme transaction holatini tekshirish mumkin (CheckTransaction API)
    // Lekin asosiy status webhook (CreateTransaction → PerformTransaction) orqali yangilanadi
    if (orderId) {
        return NextResponse.redirect(new URL(`/uz/order-success?orderId=${encodeURIComponent(orderId)}`, req.url));
    }

    return NextResponse.redirect(new URL("/uz", req.url));
}

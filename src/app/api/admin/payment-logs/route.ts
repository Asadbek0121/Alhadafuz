import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (session?.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);

        const logs = await prisma.paymentLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        // Enrich logs with order info if present in requestData or transactionId
        const enrichedLogs = await Promise.all(logs.map(async (log: any) => {
            let orderNumber: string | null = null;
            let orderTotal: number | null = null;
            let orderCustomer: string | null = null;
            let orderItemsCount: number | null = null;

            // Try to extract order reference from requestData
            if (log.requestData) {
                try {
                    const parsed = JSON.parse(log.requestData);
                    // Payme (JSON-RPC): params.account.order_id
                    if (parsed.params?.account?.order_id) {
                        orderNumber = String(parsed.params.account.order_id).replace(/^#/, '');
                    }
                    // Payme (legacy): top-level account field like "#1000001" or "1000001"
                    else if (parsed.account) {
                        orderNumber = String(parsed.account).replace(/^#/, '');
                    }
                    // Click: merchant_trans_id
                    else if (parsed.merchant_trans_id) {
                        orderNumber = String(parsed.merchant_trans_id).replace(/^#/, '');
                    }
                    // Fallback: transactionId column may store the order number directly
                    if (!orderNumber && log.transactionId) {
                        orderNumber = log.transactionId.replace(/^#/, '');
                    }
                } catch {
                    // Ignore parse error
                }
            }

            // Find matching order in database
            if (orderNumber) {
                try {
                    const order = await prisma.order.findFirst({
                        where: {
                            OR: [
                                { orderNumber },
                                { id: orderNumber }
                            ]
                        },
                        select: {
                            orderNumber: true,
                            total: true,
                            shippingName: true,
                            shippingPhone: true,
                            items: { select: { id: true } }
                        }
                    });

                    if (order) {
                        orderTotal = order.total;
                        orderCustomer = order.shippingName || order.shippingPhone;
                        orderItemsCount = order.items.length;
                    }
                } catch {
                    // Ignore DB lookup error
                }
            }

            return {
                ...log,
                orderNumber,
                orderTotal,
                orderCustomer,
                orderItemsCount
            };
        }));

        return NextResponse.json(enrichedLogs);
    } catch (error) {
        console.error("Failed to fetch logs:", error);
        return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
    }
}

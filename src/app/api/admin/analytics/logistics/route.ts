
import { NextResponse } from "next/server";
import { AnalyticsService } from "@/services/AnalyticsService";
import { auth } from "@/auth";

const analyticsService = new AnalyticsService();

export async function GET() {
    // Bu endpoint tushum va kuryerlarning joriy GPS koordinatalarini qaytaradi —
    // himoyasiz qolsa ular ochiq internetga chiqadi.
    const session = await auth();
    if ((session?.user as any)?.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const stats = await analyticsService.getDeliveryStats();
        const heatmap = await analyticsService.getCourierHeatmap();
        return NextResponse.json({ stats, heatmap });
    } catch (error) {
        console.error("Analytics Route Error:", error);
        return NextResponse.json({
            error: "Internal Error",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

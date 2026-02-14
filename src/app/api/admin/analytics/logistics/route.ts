
import { NextResponse } from "next/server";
import { AnalyticsService } from "@/services/AnalyticsService";

const analyticsService = new AnalyticsService();

export async function GET() {
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

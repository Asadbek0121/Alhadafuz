import { prisma } from "./prisma";
import { headers } from "next/headers";

export async function logActivity(userId: string, action: string, details?: any) {
    try {
        const headerList = await headers();
        const ip = headerList.get("x-forwarded-for") || headerList.get("x-real-ip") || "unknown";
        const userAgent = headerList.get("user-agent") || "unknown";

        await (prisma as any).activityLog.create({
            data: {
                userId,
                action,
                details: details ? JSON.stringify(details) : null,
                ip,
                userAgent,
            }
        });

        // Update last login if LOGIN
        if (action === "LOGIN") {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    lastLoginAt: new Date(),
                    lastIp: ip
                } as any
            });
        }
    } catch (error) {
        console.error("Activity logging failed:", error);
    }
}

export async function checkRisk(userId: string, ip: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    }) as any;

    if (user && user.lastIp && user.lastIp !== ip) {
        // IP changed - possible risk
        return { highRisk: true, reason: "NEW_LOCATION" };
    }
    return { highRisk: false };
}

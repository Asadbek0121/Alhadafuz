"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateOrderStatus(orderId: string, status: string) {
    const session = await auth();
    console.log("Server Action Session Debug:", JSON.stringify(session, null, 2));

    // Strict admin check
    if (!session || session.user?.role !== 'ADMIN') {
        console.error("Unauthorized Access Attempt:", {
            hasSession: !!session,
            role: session?.user?.role,
            id: session?.user?.id
        });
        throw new Error('Unauthorized');
    }

    try {
        await prisma.order.update({
            where: { id: orderId },
            data: { status }
        });

        // Try to log activity, ignore failure if table issues exist
        try {
            if ((prisma as any).activityLog) {
                await (prisma as any).activityLog.create({
                    data: {
                        adminId: session.user.id!,
                        action: 'UPDATE_ORDER',
                        details: `Order ${orderId} status updated to ${status}`
                    }
                });
            }
        } catch (e) {
            console.error("Activity Log failed:", e);
        }

        revalidatePath('/admin/orders');
        return { success: true };
    } catch (error) {
        console.error("Order update failed:", error);
        throw new Error('Failed to update order');
    }
}

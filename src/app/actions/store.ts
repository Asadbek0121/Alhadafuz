'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

export async function deleteStore(id: string) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'ADMIN') {
            return { success: false, error: "Huquqingiz yo'q" };
        }

        // Use deleteMany for robustness (avoids error if already deleted)
        await prisma.store.deleteMany({
            where: { id }
        });

        // Revalidate cache
        revalidatePath('/admin/stores');
        revalidatePath('/api/stores');

        return { success: true };
    } catch (error) {
        console.error("Delete store error:", error);
        return { success: false, error: "O'chirishda xatolik yuz berdi" };
    }
}

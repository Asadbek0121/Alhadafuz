import { prisma } from "@/lib/prisma";
import CreateOrderForm from "./CreateOrderForm";

export default async function CreateOrderPage() {
    const users = await prisma.user.findMany({
        select: { id: true, name: true, phone: true },
        orderBy: { createdAt: 'desc' },
        take: 100 // Limit initial load for performance
    });

    const products = await prisma.product.findMany({
        where: { isDeleted: false, status: 'ACTIVE' },
        select: { id: true, title: true, price: true, image: true, stock: true },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="p-6 bg-gray-50/50 min-h-screen">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Yangi buyurtma yaratish</h1>
            <CreateOrderForm users={users} products={products} />
        </div>
    );
}

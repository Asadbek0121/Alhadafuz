
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seed: Mock buyurtmalar yaratilmoqda...');

    const admin = await prisma.user.findUnique({ where: { email: 'admin@hadaf.uz' } });
    if (!admin) {
        console.log('Admin topilmadi');
        return;
    }

    const products = await prisma.product.findMany({ take: 3 });
    if (products.length === 0) {
        console.log('Mahsulotlar topilmadi. Avval seed-categories va prisma/seed.ts ni ishga tushiring.');
        return;
    }

    // So'nggi 30 kun uchun buyurtmalar yaratish
    for (let i = 0; i < 20; i++) {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));

        const order = await prisma.order.create({
            data: {
                userId: admin.id,
                status: Math.random() > 0.3 ? 'DELIVERED' : 'PENDING',
                total: products[0].price * (i + 1),
                paymentMethod: 'CASH',
                deliveryMethod: 'COURIER',
                createdAt: date,
                items: {
                    create: [
                        {
                            productId: products[0].id,
                            title: products[0].title,
                            price: products[0].price,
                            quantity: 1,
                            image: products[0].image
                        }
                    ]
                }
            }
        });
    }

    // Bir nechta xabarlar yaratish
    for (let i = 0; i < 5; i++) {
        await (prisma as any).message.create({
            data: {
                content: `Salom, bu test xabari ${i + 1}`,
                senderId: admin.id,
                receiverId: admin.id, // O'z-o'ziga yoki boshqa admin bo'lsa
                source: 'WEB'
            }
        });
    }

    console.log('✅ Dashboard uchun mock ma\'lumotlar muvaffaqiyatli yaratildi!');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());

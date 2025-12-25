
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Tozalash boshlanmoqda...');

    // Delete related data first
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.address.deleteMany();
    await prisma.review.deleteMany();
    await prisma.wishlistItem.deleteMany();
    await prisma.wishlist.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();

    // Delete Products and Categories
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();

    // Optionally delete users except Admin (or all)
    // await prisma.user.deleteMany();

    console.log('✅ Barcha ma\'lumotlar tozalandi!');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());


import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Seed boshlandi...');

    // 1. Do'konlar qo'shish
    const stores = [
        { name: 'Termez Markaziy Do\'koni', address: 'Alisher Navoiy ko\'chasi, 45', lat: 37.2272, lng: 67.2752 },
        { name: 'Surxon Savdo Markazi', address: 'Termiz sh., Beruniy ko\'chasi', lat: 37.2350, lng: 67.2880 },
        { name: 'Hadaf Express', address: 'At-Termiziy ko\'chasi', lat: 37.2180, lng: 67.2650 }
    ];

    for (const s of stores) {
        await prisma.store.upsert({
            where: { id: s.name.replace(/\s/g, '_') }, // Dummy unique ID
            update: s,
            create: { ...s, id: s.name.replace(/\s/g, '_') }
        });
    }

    // 2. Kuryer profili yaratish (agar yo'q bo'lsa)
    // Buning uchun avval kuryer rolidagi user kerak.
    // Hozirgi test uchun birinchi adminni kuryer qilib ko'ramiz yoki yangi user ochamiz.

    const courierUser = await prisma.user.findFirst({ where: { role: 'COURIER' } });

    if (courierUser) {
        await prisma.courierProfile.upsert({
            where: { userId: courierUser.id },
            update: { status: 'ONLINE', currentLat: 37.2285, currentLng: 67.2801 },
            create: {
                userId: courierUser.id,
                status: 'ONLINE',
                currentLat: 37.2285,
                currentLng: 67.2801
            }
        });
        console.log('Kuryer profili yangilandi.');
    } else {
        console.log('Hali COURIER rolidagi user mavjud emas. Admin panelidan yarating.');
    }

    console.log('Seed yakunlandi.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

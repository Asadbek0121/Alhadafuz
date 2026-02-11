import { prisma } from './src/lib/prisma';

async function main() {
    const products = await (prisma as any).product.findMany({
        take: 5
    });
    console.log(JSON.stringify(products, null, 2));
}

main();

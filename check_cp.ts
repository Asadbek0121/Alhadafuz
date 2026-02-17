import { prisma } from "./src/lib/prisma"; async function main() { const cp = await prisma.courierProfile.findFirst({ include: { user: true } }); console.log(JSON.stringify(cp, null, 2)); } main();

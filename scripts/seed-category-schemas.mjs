/**
 * Category Schema seed — mavjud kategoriyalarga spec'dagi attribute definition'lar
 * qo'shadi. Idempotent: allaqachon mavjud defs (same categoryId + name) takrorlanmaydi.
 *
 * Run: node scripts/seed-category-schemas.mjs
 * (Node 22 bilan; .env dagi Supabase URL ishlatiladi)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Kategoriya nomi -> definitionlar. `forVariant: true` = variant o'qi (Rang/O'lcham)
const SCHEMAS = {
  'Kiyim-kechaklar': [
    { name: 'jins', label: 'Jins', type: 'SELECT', options: 'Erkak,Ayol,Uniseks', required: false },
    { name: 'material', label: 'Material', type: 'SELECT', options: 'Paxta,Polyester,Jun,Kashemir', required: false },
    { name: 'mavsum', label: 'Mavsum', type: 'MULTI_SELECT', options: 'Yoz,Qish,Bahor,Kuz', required: false },
    { name: 'rang', label: 'Rang', type: 'COLOR', options: '', forVariant: true, required: false },
    { name: 'olcham', label: 'O\'lcham', type: 'SELECT', options: 'XS,S,M,L,XL,XXL,3XL,4XL', forVariant: true, required: false },
    { name: 'brend', label: 'Brend', type: 'TEXT', required: false },
  ],
  'O\'yinchoqlar': [
    { name: 'yosh_toifasi', label: 'Yosh toifasi', type: 'SELECT', options: '0-2 yosh,3-5 yosh,6-8 yosh,9-12 yosh,13+ yosh', required: false },
    { name: 'material', label: 'Material', type: 'SELECT', options: 'Plastik,Yog\'och,Mato,Metall', required: false },
    { name: 'rang', label: 'Rang', type: 'COLOR', options: '', forVariant: true, required: false },
    { name: 'olcham', label: 'O\'lcham', type: 'SELECT', options: 'Kichik,O\'rta,Katta', forVariant: true, required: false },
    { name: 'brend', label: 'Brend', type: 'TEXT', required: false },
  ],
  'Bolalar kiyimlari': [
    { name: 'jins', label: 'Jins', type: 'SELECT', options: 'O\'g\'il,Qiz,Uniseks', required: false },
    { name: 'material', label: 'Material', type: 'SELECT', options: 'Paxta,Polyester', required: false },
    { name: 'rang', label: 'Rang', type: 'COLOR', options: '', forVariant: true, required: false },
    { name: 'olcham', label: 'O\'lcham', type: 'SELECT', options: '0-3M,3-6M,6-12M,1Y,2Y,3Y,4Y,5Y,6Y,7Y,8Y', forVariant: true, required: false },
  ],
  'Xitoy tovarlari': [
    { name: 'kelib_chiqishi', label: 'Kelib chiqishi', type: 'TEXT', required: false },
    { name: 'garantiya', label: 'Garantiya', type: 'TEXT', required: false },
  ],
};

async function main() {
  let added = 0;
  for (const [catName, defs] of Object.entries(SCHEMAS)) {
    const category = await prisma.category.findFirst({ where: { name: catName } });
    if (!category) {
      console.log(`SKIP: "${catName}" kategoriyasi topilmadi`);
      continue;
    }
    const existing = await prisma.categoryAttributeDefinition.findMany({
      where: { categoryId: category.id },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((d) => d.name));

    let order = 0;
    for (const d of defs) {
      if (existingNames.has(d.name)) {
        console.log(`  - "${d.name}" mavjud, o'tkazildi`);
        order++;
        continue;
      }
      await prisma.categoryAttributeDefinition.create({
        data: {
          categoryId: category.id,
          name: d.name,
          label: d.label,
          type: d.type || 'TEXT',
          required: !!d.required,
          options: d.options || null,
          forVariant: !!d.forVariant,
          order,
          isActive: true,
        },
      });
      added++;
      order++;
    }
  }
  console.log(`\nJami qo'shilgan definitionlar: ${added}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLANS = [
  {
    categorySlug: 'qalambooks-1776709755846',
    name: 'Qalambooks (kitob)',
    defs: [
      {
        name: 'format', label: 'Format', type: 'SELECT', forVariant: true, order: 7,
        options: 'Yumshoq muqova,Qattiq muqova,Fleksibl',
      },
    ],
  },
  {
    categorySlug: 'kiyim-kechaklar-1787291487746',
    name: 'Kiyim-kechaklar',
    defs: [
      { name: 'brend', label: 'Brend', type: 'TEXT', forVariant: false, order: 1 },
      // material — existing def (forVariant=true), faqat order yangilanadi
      { name: 'material', label: 'Material', type: 'TEXT', forVariant: true, order: 2 },
      {
        name: 'mavsum', label: 'Mavsum', type: 'SELECT', forVariant: false, order: 3,
        options: 'Bahor,Yoz,Kuz,Qish',
      },
      { name: 'rang', label: 'Rang', type: 'COLOR', forVariant: true, order: 4 },
      // o_lcham — existing def (forVariant=true), faqat order yangilanadi
      {
        name: 'o_lcham', label: "O'lcham", type: 'SELECT', forVariant: true, order: 5,
        options: 'L,M,S,XL,XXL',
      },
    ],
  },
  {
    categorySlug: 'oyinchoqlar-1787291535487',
    name: "O'yinchoqlar",
    defs: [
      {
        name: 'yosh_toifasi', label: 'Yosh toifasi', type: 'SELECT', forVariant: false, order: 1,
        options: '0-3,4-7,8-12,13+',
      },
      { name: 'material', label: 'Material', type: 'TEXT', forVariant: false, order: 2 },
      { name: 'brend', label: 'Brend', type: 'TEXT', forVariant: false, order: 3 },
      { name: 'rang', label: 'Rang', type: 'COLOR', forVariant: true, order: 4 },
      {
        name: 'olcham', label: "O'lcham", type: 'SELECT', forVariant: true, order: 5,
        options: "Kichik,O'rta,Katta",
      },
    ],
  },
];

async function main() {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const plan of PLANS) {
    const category = await prisma.category.findUnique({
      where: { slug: plan.categorySlug },
      select: { id: true, name: true },
    });

    if (!category) {
      console.log(`[SKIP] "${plan.name}" kategoriyasi topilmadi (slug=${plan.categorySlug}) — tashlab o'tildi`);
      skipped++;
      continue;
    }

    const existingDefs = await prisma.categoryAttributeDefinition.findMany({
      where: { categoryId: category.id },
      select: { id: true, name: true, order: true },
    });
    const existingByName = new Map(existingDefs.map((d) => [d.name, d]));

    console.log(`\n=== ${category.name} (${category.id}) ===`);

    for (const def of plan.defs) {
      const existing = existingByName.get(def.name);

      if (existing) {
        if (existing.order !== def.order) {
          await prisma.categoryAttributeDefinition.update({
            where: { id: existing.id },
            data: { order: def.order },
          });
          updated++;
          console.log(`[UPDATE order] ${def.name} → order=${def.order} (avval ${existing.order})`);
        } else {
          skipped++;
          console.log(`[EXISTS] ${def.name} — order bir xil, tegilmadi`);
        }
        continue;
      }

      await prisma.categoryAttributeDefinition.create({
        data: {
          categoryId: category.id,
          name: def.name,
          label: def.label,
          type: def.type,
          forVariant: def.forVariant,
          order: def.order,
          options: def.options ?? null,
          required: def.required ?? false,
        },
      });
      created++;
      console.log(`[CREATE] ${def.name} (${def.type}, forVariant=${def.forVariant}, order=${def.order})`);
    }
  }

  console.log(`\nYakun: ${created} yaratildi, ${updated} order yangilandi, ${skipped} mavjud/skip`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

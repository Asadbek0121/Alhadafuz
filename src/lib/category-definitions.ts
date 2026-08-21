import { prisma } from '@/lib/prisma';

export async function getEffectiveCategoryDefinitions(
  categoryId: string,
  options?: { includeValuesCount?: boolean }
) {
  const visited = new Set<string>();
  const chain: string[] = [];

  let currentId: string | null = categoryId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    chain.unshift(currentId);

    const cat: { parentId: string | null } | null = await (prisma as any).category.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });

    if (!cat) break;
    currentId = cat.parentId;
  }

  const include = options?.includeValuesCount
    ? { _count: { select: { values: true } as any } }
    : undefined;

  // chain: [root, ..., leaf]. Root → leaf tartibda yurib, child defs
  // parent defs'ni override qiladi (same name bo'lsa keyingi set g'alaba qiladi).
  const nameMap = new Map<string, any>();

  for (let i = 0; i < chain.length; i++) {
    const defs = await (prisma as any).categoryAttributeDefinition.findMany({
      where: { categoryId: chain[i] },
      include,
    });

    for (const def of defs) {
      def._effectiveCategoryId = def.categoryId;
      nameMap.set(def.name, def);
    }
  }

  return Array.from(nameMap.values()).sort(
    (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)
  );
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import {
    validateAttributeValue,
    serializeAttributeValue,
    deserializeAttributeValue,
} from '@/lib/universal-product';

export const dynamic = 'force-dynamic';

const bulkValuesSchema = z.object({
    attributes: z.array(
        z.object({
            attributeDefId: z.string().min(1),
            value: z.unknown().nullable().optional(),
        })
    ).max(200),
});

// Product'ning category'larini aniqlaymiz (single categoryId + M-N categories)
async function getProductCategoryIds(productId: string): Promise<string[]> {
    const product = await (prisma as any).product.findUnique({
        where: { id: productId },
        include: { categories: { select: { id: true } } },
    });
    if (!product) return [];
    const ids = new Set<string>();
    if (product.categoryId) ids.add(product.categoryId);
    for (const c of product.categories || []) ids.add(c.id);
    return Array.from(ids);
}

async function getCategoryDefinitions(categoryIds: string[]) {
    if (categoryIds.length === 0) return [];
    return (prisma as any).categoryAttributeDefinition.findMany({
        where: { categoryId: { in: categoryIds } },
    });
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'ADMIN' && userRole !== 'VENDOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    try {
        const product = await (prisma as any).product.findUnique({ where: { id } });
        if (!product) {
            return NextResponse.json({ error: 'Mahsulot topilmadi' }, { status: 404 });
        }

        const [definitions, values] = await Promise.all([
            getCategoryDefinitions(await getProductCategoryIds(id)),
            (prisma as any).productAttributeValue.findMany({
                where: { productId: id },
                include: { attributeDef: true },
            }),
        ]);

        // Definitions'ni order bo'yicha, qiymatlarni defId bo'yicha map qilamiz
        const defIdSet = new Set<string>(definitions.map((d: any) => d.id));
        const valueMap = new Map<string, any>();
        for (const v of values) valueMap.set(v.attributeDefId, v);

        const attributes = definitions
            .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
            .map((def: any) => {
                const v = valueMap.get(def.id);
                return {
                    attributeDefId: def.id,
                    name: def.name,
                    label: def.label,
                    type: def.type,
                    required: def.required,
                    options: def.options,
                    unit: def.unit,
                    minValue: def.minValue,
                    maxValue: def.maxValue,
                    forVariant: def.forVariant,
                    order: def.order,
                    value: v ? deserializeAttributeValue(def.type, v.value) : null,
                };
            });

        // Product'ning category'iga tegishli bo'lmagan legacy values ham qaytadi
        const extraValues = values
            .filter((v: any) => !defIdSet.has(v.attributeDefId))
            .map((v: any) => ({
                attributeDefId: v.attributeDefId,
                name: v.attributeDef.name,
                label: v.attributeDef.label,
                type: v.attributeDef.type,
                required: v.attributeDef.required,
                options: v.attributeDef.options,
                unit: v.attributeDef.unit,
                minValue: v.attributeDef.minValue,
                maxValue: v.attributeDef.maxValue,
                forVariant: v.attributeDef.forVariant,
                order: v.attributeDef.order,
                value: deserializeAttributeValue(v.attributeDef.type, v.value),
            }));

        return NextResponse.json({ attributes, extraValues });
    } catch (error) {
        console.error("Product attributes fetch error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'ADMIN' && userRole !== 'VENDOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    try {
        const product = await (prisma as any).product.findUnique({ where: { id } });
        if (!product) {
            return NextResponse.json({ error: 'Mahsulot topilmadi' }, { status: 404 });
        }

        const body = await req.json();
        const parsed = bulkValuesSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        const { attributes } = parsed.data;
        const categoryIds = await getProductCategoryIds(id);
        const definitions = await getCategoryDefinitions(categoryIds);
        const defMap = new Map<string, any>();
        for (const d of definitions) defMap.set(d.id, d);

        // 1. Definition product'ning category'iga tegishli bo'lishi shart
        for (const attr of attributes) {
            if (!defMap.has(attr.attributeDefId)) {
                return NextResponse.json({
                    error: `attributeDefId (${attr.attributeDefId}) product category'siga tegishli emas`,
                }, { status: 400 });
            }
        }

        // 2. required definitions tekshiruvi
        const requiredDefs = definitions.filter((d: any) => d.required);
        for (const def of requiredDefs) {
            const provided = attributes.find((a: any) => a.attributeDefId === def.id);
            if (!provided || provided.value === undefined || provided.value === null || provided.value === '') {
                return NextResponse.json({ error: `${def.label} qiymati shart` }, { status: 400 });
            }
        }

        // 3. Type asosida qiymat validatsiyasi
        for (const attr of attributes) {
            const def = defMap.get(attr.attributeDefId);
            if (attr.value === undefined || attr.value === null || attr.value === '') continue;
            const err = validateAttributeValue(def, attr.value);
            if (err) return NextResponse.json({ error: err }, { status: 400 });
        }

        // 4. Transaction: deleteMany + createMany (bulk replace)
        const createData = attributes
            .filter((a: any) => a.value !== undefined && a.value !== null && a.value !== '')
            .map((a: any) => {
                const def = defMap.get(a.attributeDefId);
                return {
                    productId: id,
                    attributeDefId: a.attributeDefId,
                    value: serializeAttributeValue(def.type, a.value),
                };
            });

        await (prisma as any).$transaction([
            (prisma as any).productAttributeValue.deleteMany({ where: { productId: id } }),
            ...(createData.length > 0
                ? [(prisma as any).productAttributeValue.createMany({ data: createData })]
                : []),
        ]);

        const result = await (prisma as any).productAttributeValue.findMany({
            where: { productId: id },
            include: { attributeDef: true },
        });

        return NextResponse.json({ attributes: result });
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return NextResponse.json({ error: 'Dublikat attribute qiymati — unique constraint buzildi' }, { status: 409 });
        }
        console.error("Product attributes update error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
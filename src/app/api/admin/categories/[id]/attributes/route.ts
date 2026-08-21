
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { attributeDefSchema, validateDefinitionTypeCombo } from '@/lib/universal-product';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    try {
        const category = await (prisma as any).category.findUnique({ where: { id } });
        if (!category) {
            return NextResponse.json({ error: 'Kategoriya topilmadi' }, { status: 404 });
        }

        const definitions = await (prisma as any).categoryAttributeDefinition.findMany({
            where: { categoryId: id },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            include: { _count: { select: { values: true } } },
        });

        return NextResponse.json({ definitions });
    } catch (error) {
        console.error("Category attributes fetch error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    try {
        const category = await (prisma as any).category.findUnique({ where: { id } });
        if (!category) {
            return NextResponse.json({ error: 'Kategoriya topilmadi' }, { status: 404 });
        }

        const body = await req.json();
        const parsed = attributeDefSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        const data = parsed.data;
        const comboError = validateDefinitionTypeCombo(
            data.type, data.options ?? null, data.unit ?? null,
            data.minValue ?? null, data.maxValue ?? null,
        );
        if (comboError) {
            return NextResponse.json({ error: comboError }, { status: 400 });
        }

        // name category ichida unique bo'lishini tekshiramiz
        const existing = await (prisma as any).categoryAttributeDefinition.findFirst({
            where: { categoryId: id, name: data.name },
        });
        if (existing) {
            return NextResponse.json({ error: `"${data.name}" nomli attribute allaqachon mavjud` }, { status: 409 });
        }

        const definition = await (prisma as any).categoryAttributeDefinition.create({
            data: {
                categoryId: id,
                name: data.name,
                label: data.label,
                type: data.type,
                required: data.required,
                options: data.options ?? null,
                unit: data.unit ?? null,
                minValue: data.minValue ?? null,
                maxValue: data.maxValue ?? null,
                forVariant: data.forVariant,
                order: data.order,
            },
        });

        return NextResponse.json(definition, { status: 201 });
    } catch (error) {
        console.error("Category attribute create error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
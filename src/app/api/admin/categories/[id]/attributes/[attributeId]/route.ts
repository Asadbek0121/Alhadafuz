
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { attributeDefPatchSchema, validateDefinitionTypeCombo } from '@/lib/universal-product';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, context: { params: Promise<{ id: string; attributeId: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, attributeId } = await context.params;

    try {
        // Attribute shu category'ga tegishli ekanini tekshiramiz
        const existing = await (prisma as any).categoryAttributeDefinition.findFirst({
            where: { id: attributeId, categoryId: id },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Attribute topilmadi yoki boshqa kategoriyaga tegishli' }, { status: 404 });
        }

        const body = await req.json();
        const parsed = attributeDefPatchSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        const data = parsed.data;
        // Final state bo'yicha type/options kombinatsiyasini tekshiramiz
        const mergedType = data.type ?? existing.type;
        const mergedOptions = data.options !== undefined ? (data.options ?? null) : existing.options;
        const mergedUnit = data.unit !== undefined ? (data.unit ?? null) : existing.unit;
        const mergedMin = data.minValue !== undefined ? (data.minValue ?? null) : existing.minValue;
        const mergedMax = data.maxValue !== undefined ? (data.maxValue ?? null) : existing.maxValue;

        const comboError = validateDefinitionTypeCombo(mergedType, mergedOptions, mergedUnit, mergedMin, mergedMax);
        if (comboError) {
            return NextResponse.json({ error: comboError }, { status: 400 });
        }

        // name o'zgartirilayotganda category ichida unique
        if (data.name && data.name !== existing.name) {
            const dup = await (prisma as any).categoryAttributeDefinition.findFirst({
                where: { categoryId: id, name: data.name, NOT: { id: attributeId } },
            });
            if (dup) {
                return NextResponse.json({ error: `"${data.name}" nomli attribute allaqachon mavjud` }, { status: 409 });
            }
        }

        const updateData: Record<string, unknown> = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.label !== undefined) updateData.label = data.label;
        if (data.type !== undefined) updateData.type = data.type;
        if (data.required !== undefined) updateData.required = data.required;
        if (data.options !== undefined) updateData.options = data.options ?? null;
        if (data.unit !== undefined) updateData.unit = data.unit ?? null;
        if (data.allowedUnits !== undefined) updateData.allowedUnits = data.allowedUnits ?? null;
        if (data.visibleWhen !== undefined) updateData.visibleWhen = data.visibleWhen ?? null;
        if (data.requiredWhen !== undefined) updateData.requiredWhen = data.requiredWhen ?? null;
        if (data.dependsOn !== undefined) updateData.dependsOn = data.dependsOn ?? null;
        if (data.minValue !== undefined) updateData.minValue = data.minValue ?? null;
        if (data.maxValue !== undefined) updateData.maxValue = data.maxValue ?? null;
        if (data.forVariant !== undefined) updateData.forVariant = data.forVariant;
        if (data.order !== undefined) updateData.order = data.order;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;

        const updated = await (prisma as any).categoryAttributeDefinition.update({
            where: { id: attributeId },
            data: updateData,
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Category attribute update error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string; attributeId: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, attributeId } = await context.params;

    try {
        const existing = await (prisma as any).categoryAttributeDefinition.findFirst({
            where: { id: attributeId, categoryId: id },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Attribute topilmadi yoki boshqa kategoriyaga tegishli' }, { status: 404 });
        }

        await (prisma as any).categoryAttributeDefinition.delete({
            where: { id: attributeId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Category attribute delete error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
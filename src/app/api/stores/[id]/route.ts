import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await props.params;
        const { id } = params;
        const body = await req.json();

        const store = await prisma.store.update({
            where: { id },
            data: {
                name: body.name,
                address: body.address,
                phone: body.phone,
                workingHours: body.workingHours,
                lat: body.lat ? parseFloat(body.lat) : null,
                lng: body.lng ? parseFloat(body.lng) : null,
            }
        });

        return NextResponse.json(store);
    } catch (error) {
        console.error("Store update error:", error);
        return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    console.log("[API] DELETE Store Request received");
    try {
        const session = await auth();
        if (session?.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await props.params;
        const { id } = params;
        console.log(`[API] Deleting store with ID: ${id}`);

        const result = await prisma.store.deleteMany({ where: { id } });
        console.log(`[API] Delete result:`, result);

        return NextResponse.json({ success: true, count: result.count });
    } catch (error: any) {
        console.error("[API] Store delete error:", error);
        return NextResponse.json({ error: 'Failed to delete store', details: error?.message || String(error) }, { status: 500 });
    }
}

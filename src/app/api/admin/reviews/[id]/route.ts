import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { status, adminReply } = await req.json();

        const updates: string[] = [];
        updates.push(`"updatedAt" = NOW()`);

        if (status) {
            updates.push(`"status" = '${status}'`);
        }

        if (adminReply !== undefined) {
            const safeReply = adminReply.replace(/'/g, "''");
            updates.push(`"adminReply" = '${safeReply}'`);
        }

        // Ensure id is safe (it comes from URL params which are generally safe but good practice)
        const safeId = params.id.replace(/'/g, "''");

        // Construct raw update query
        // We use RETURNING * to get the updated record back
        // Postgres syntax
        const query = `UPDATE "Review" SET ${updates.join(', ')} WHERE "id" = '${safeId}' RETURNING *`;

        // Execute raw query
        const result: any[] = await (prisma as any).$queryRawUnsafe(query);

        if (result && result.length > 0) {
            return NextResponse.json(result[0]);
        } else {
            throw new Error("Review not found or update failed");
        }

    } catch (error) {
        console.error("Error updating review:", error);
        return NextResponse.json({ error: 'Failed to update review', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await (prisma as any).review.delete({
            where: { id: params.id }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting review:", error);
        return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
    }
}

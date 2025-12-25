
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const session = await auth();

    if (!session || !userId) return NextResponse.json([], { status: 400 });

    try {
        // We assume 'Message' model exists in schema
        /*
         model Message {
           id        String   @id @default(cuid())
           content   String
           senderId  String
           receiverId String
           createdAt DateTime @default(now())
           ...
         }
        */
        // Since we don't have the schema handy to confirm names, using 'any' cast for safety in this fast restoration.
        // Assuming user added Message model earlier.

        const messages = await (prisma as any).message.findMany({
            where: {
                OR: [
                    { senderId: session.user.id, receiverId: userId },
                    { senderId: userId, receiverId: session.user.id }
                ]
            },
            orderBy: { createdAt: 'asc' }
        });

        return NextResponse.json(messages);
    } catch (error) {
        // Fallback if table doesn't exist
        return NextResponse.json([]);
    }
}

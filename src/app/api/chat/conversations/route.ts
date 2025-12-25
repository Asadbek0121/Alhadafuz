
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: Request) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Fetch users who have messages with admin or are potential contacts
        // For simplicity, we fetch all users, or you can perform a complex join to get last message
        // This is a simplified version: fetching users
        const users = await prisma.user.findMany({
            where: {
                role: 'USER', // Example: fetch all normal users
            },
            take: 20
        });

        // Map to chat UI format
        const conversations = users.map(u => ({
            id: u.id,
            name: u.name || 'User',
            image: u.image || `https://ui-avatars.com/api/?name=${u.name || 'User'}`,
            status: 'offline', // would need real-time status logic
            lastMessage: 'Tap to chat',
            time: ''
        }));

        return NextResponse.json(conversations);
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

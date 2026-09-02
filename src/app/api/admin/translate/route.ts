import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { translateCategoryName } from '@/lib/translate';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { name } = await req.json();
        if (!name) {
            return NextResponse.json({ error: 'name required' }, { status: 400 });
        }

        const translations = await translateCategoryName(String(name).trim());
        return NextResponse.json({ translations });
    } catch (e) {
        console.error("[translate] error:", e);
        return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
    }
}

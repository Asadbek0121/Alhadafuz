
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ fileId: string }> }
) {
    const session = await auth();
    if (!session || ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'VENDOR')) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { fileId } = await params;
    const botToken = process.env.COURIER_BOT_TOKEN;

    if (!botToken) {
        return new NextResponse('Bot token not configured', { status: 500 });
    }

    try {
        // 1. Get file path from Telegram
        const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
        const fileData = await fileRes.json();

        if (!fileData.ok) {
            return new NextResponse('Telegram file not found', { status: 404 });
        }

        const filePath = fileData.result.file_path;

        // 2. Fetch the actual image
        const imageRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
        const imageBlob = await imageRes.arrayBuffer();

        return new NextResponse(imageBlob, {
            headers: {
                'Content-Type': imageRes.headers.get('Content-Type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Telegram photo proxy error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

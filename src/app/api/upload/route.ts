import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { auth } from '@/auth';

export async function POST(req: Request) {
    console.log("Upload request started");
    const session = await auth();
    console.log("Upload session:", session?.user?.email, session?.user?.role);

    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            console.log("No file found in formData");
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        console.log("File received:", file.name, file.size);

        const buffer = Buffer.from(await file.arrayBuffer());
        // Clean filename and ensure uniqueness
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = uniqueSuffix + '-' + file.name.replace(/[^a-zA-Z0-9.-]/g, '');

        const uploadDir = join(process.cwd(), 'public/uploads');
        // Ensure directory exists
        await mkdir(uploadDir, { recursive: true });

        const path = join(uploadDir, filename);

        await writeFile(path, buffer);
        console.log("File written to:", path);

        const url = `/uploads/${filename}`;
        return NextResponse.json({ url });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}

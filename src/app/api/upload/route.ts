
import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
// No import needed for crypto when using global crypto.randomUUID() in Node.js 19+ or Next.js

import { auth } from "@/auth";

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate unique filename
        const ext = file.name.split(".").pop();
        const filename = `${crypto.randomUUID()}.${ext}`;
        const path = join(process.cwd(), "public/uploads", filename);

        await writeFile(path, buffer);

        const url = `/uploads/${filename}`;
        return NextResponse.json({ url });
    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

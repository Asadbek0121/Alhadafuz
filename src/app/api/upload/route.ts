export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            console.error("Upload unauthorized: No session found");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            console.error("Upload error: No file in form data");
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        console.log(`Uploading file: ${file.name} (${file.size} bytes)`);

        // Upload to Vercel Blob
        const blob = await put(file.name, file, {
            access: 'public',
        });

        console.log(`Upload successful: ${blob.url}`);
        return NextResponse.json({ url: blob.url });
    } catch (error: any) {
        console.error("Upload error detailed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@/auth";

// Configuration
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        console.log(`Uploading file to Cloudinary: ${file.name} (${file.size} bytes)`);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        const uploadResult: any = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: "uzm_products", // Keep everything organized
                },
                (error: any, result: any) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(result);
                }
            ).end(buffer);
        });

        console.log(`Cloudinary upload successful: ${uploadResult.secure_url}`);
        return NextResponse.json({ url: uploadResult.secure_url });

    } catch (error: any) {
        console.error("Cloudinary upload error:", error);
        return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
    }
}

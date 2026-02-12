import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { put } from "@vercel/blob";
import { auth } from "@/auth";

export const runtime = 'nodejs';

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
            return NextResponse.json({ error: "Fayl yuborilmadi" }, { status: 400 });
        }

        console.log(`Yuklashga tayyor: ${file.name} (${file.size} bytes)`);

        // 1. Try Vercel Blob
        if (process.env.BLOB_READ_WRITE_TOKEN) {
            try {
                const blob = await put(`uzm/${Date.now()}-${file.name}`, file, {
                    access: "public",
                    token: process.env.BLOB_READ_WRITE_TOKEN,
                });
                console.log(`Vercel Blob muvaffaqiyatli: ${blob.url}`);
                return NextResponse.json({ url: blob.url });
            } catch (blobError: any) {
                console.error("Vercel Blob xatosi:", blobError.message);
                // Continue to Cloudinary if blob fails, unless Cloudinary is also not configured
                if (!process.env.CLOUDINARY_API_KEY) {
                    throw blobError;
                }
            }
        }

        // 2. Try Cloudinary
        if (process.env.CLOUDINARY_API_KEY) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const buffer = new Uint8Array(arrayBuffer);

                const result: any = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        { folder: "uzm_products" },
                        (error: any, result: any) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    ).end(buffer);
                });

                console.log(`Cloudinary muvaffaqiyatli: ${result.secure_url}`);
                return NextResponse.json({ url: result.secure_url });
            } catch (cloudError: any) {
                console.error("Cloudinary xatosi:", cloudError.message);
                throw cloudError;
            }
        }

        throw new Error("Rasm yuklash tizimi sozlanmagan (Vercel Blob yoki Cloudinary kerak)");

    } catch (error: any) {
        console.error("Critical Upload Error:", error);
        return NextResponse.json({
            error: error.message || "Yuklashda server xatosi yuz berdi",
            stack: error.stack
        }, { status: 500 });
    }
}

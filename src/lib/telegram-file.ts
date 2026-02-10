import { put } from "@vercel/blob";
import { prisma } from "./prisma";

export async function uploadTelegramFileToBlob(fileId: string, fileName: string): Promise<string | null> {
    let token: string | null = process.env.TELEGRAM_BOT_TOKEN || null;

    if (!token) {
        try {
            const settings = await prisma.storeSettings.findFirst();
            token = settings?.telegramBotToken || null;
        } catch (e) {
            console.error("Error fetching bot token from DB for file upload:", e);
        }
    }

    if (!token) return null;

    try {
        // 1. Get file path from Telegram
        const getFileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
        const getFileData = await getFileRes.json();

        if (!getFileData.ok) {
            console.error("Telegram getFile error:", getFileData);
            return null;
        }

        const filePath = getFileData.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

        // 2. Download file
        const fileRes = await fetch(fileUrl);
        const fileBuffer = await fileRes.arrayBuffer();

        // 3. Upload to Vercel Blob
        const blob = await put(fileName, fileBuffer, {
            access: 'public',
            addRandomSuffix: true,
        });

        return blob.url;
    } catch (error) {
        console.error("Error uploading telegram file to blob:", error);
        return null;
    }
}

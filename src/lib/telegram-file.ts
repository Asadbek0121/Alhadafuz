
import { put } from "@vercel/blob";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function uploadTelegramFileToBlob(fileId: string, fileName: string): Promise<string | null> {
    if (!BOT_TOKEN) return null;

    try {
        // 1. Get file path from Telegram
        const getFileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
        const getFileData = await getFileRes.json();

        if (!getFileData.ok) {
            console.error("Telegram getFile error:", getFileData);
            return null;
        }

        const filePath = getFileData.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

        // 2. Download file
        const fileRes = await fetch(fileUrl);
        const fileBuffer = await fileRes.arrayBuffer();

        // 3. Upload to Vercel Blob
        const blob = await put(fileName, fileBuffer, {
            access: 'public',
        });

        return blob.url;
    } catch (error) {
        console.error("Error uploading telegram file to blob:", error);
        return null;
    }
}

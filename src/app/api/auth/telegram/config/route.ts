import { NextResponse } from "next/server";

export async function GET() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const username = process.env.TELEGRAM_BOT_USERNAME || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

    if (!token || !username) {
        return NextResponse.json({ error: "Telegram login not configured" }, { status: 404 });
    }

    const botId = token.split(":")[0];
    if (!/^\d+$/.test(botId)) {
        return NextResponse.json({ error: "Invalid bot configuration" }, { status: 500 });
    }

    return NextResponse.json({ botId, botUsername: username });
}

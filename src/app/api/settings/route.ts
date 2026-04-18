
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const settings = await prisma.storeSettings.findFirst({
            where: { id: 'default' }
        });

        if (!settings) {
            return NextResponse.json({ 
                cardNumber: "8600 0000 0000 0000",
                cardHolderName: "ADMIN",
                phone: "+998 90 123 45 67"
            });
        }

        // Return only public settings
        return NextResponse.json({
            siteName: settings.siteName,
            phone: settings.phone,
            email: settings.email,
            address: settings.address,
            socialLinks: settings.socialLinks,
            cardNumber: settings.cardNumber,
            cardHolderName: settings.cardHolderName
        });
    } catch (error) {
        console.error("Settings API Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

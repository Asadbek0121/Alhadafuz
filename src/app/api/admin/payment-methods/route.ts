
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET: List all payment methods
export async function GET() {
    try {
        if (!prisma.paymentMethod) {
            console.error("CRITICAL: prisma.paymentMethod is undefined. Server restart required.");
            return NextResponse.json({ error: "Server restart required (Prisma Sync)" }, { status: 503 });
        }
        const methods = await prisma.paymentMethod.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(methods);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch methods" }, { status: 500 });
    }
}

// POST: Create new payment method
export async function POST(req: NextRequest) {
    try {
        if (!prisma.paymentMethod) {
            return NextResponse.json({ error: "SERVER RESTART REQUIRED. The database schema has changed but the server hasn't picked it up. Please restart the terminal." }, { status: 503 });
        }
        const session = await auth();
        if (session?.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        console.log("Creating Payment Method. Body:", body);
        const { name, type, provider, details, config, isActive } = body;

        const method = await prisma.paymentMethod.create({
            data: { name, type, provider, details, config, isActive }
        });

        return NextResponse.json(method);
    } catch (error: any) {
        console.error("Error creating payment method:", error);
        // Check for unique constraint violation explicitly just in case
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "Bunday tizim allaqachon mavjud!" }, { status: 400 });
        }
        return NextResponse.json({ error: error.message || "Failed to create method" }, { status: 500 });
    }
}

// PUT: Update payment method
export async function PUT(req: NextRequest) {
    try {
        const session = await auth();
        if (session?.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { id, ...data } = body;

        const method = await prisma.paymentMethod.update({
            where: { id },
            data
        });

        return NextResponse.json(method);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update method" }, { status: 500 });
    }
}

// DELETE: Remove payment method
export async function DELETE(req: NextRequest) {
    try {
        const session = await auth();
        if (session?.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await prisma.paymentMethod.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete method" }, { status: 500 });
    }
}

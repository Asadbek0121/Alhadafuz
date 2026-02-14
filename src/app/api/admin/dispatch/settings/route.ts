
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import fs from 'fs/promises';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'dispatch-settings.json');

async function getSettings() {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        // Default settings
        return {
            distanceWeight: 0.4,
            ratingWeight: 0.25,
            workloadWeight: 0.2,
            responseWeight: 0.15
        };
    }
}

export async function GET() {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const settings = await getSettings();
    return NextResponse.json(settings);
}

export async function POST(req: Request) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { distanceWeight, ratingWeight, workloadWeight, responseWeight } = body;

        // Validation: total must be approx 1.0 (100%)
        const total = Number(distanceWeight) + Number(ratingWeight) + Number(workloadWeight) + Number(responseWeight);
        if (Math.abs(total - 1.0) > 0.01) {
            return NextResponse.json({ error: 'Jami foizlar 1.0 (100%) bo\'lishi shart' }, { status: 400 });
        }

        const settings = {
            distanceWeight: Number(distanceWeight),
            ratingWeight: Number(ratingWeight),
            workloadWeight: Number(workloadWeight),
            responseWeight: Number(responseWeight),
            updatedAt: new Date().toISOString()
        };

        await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        return NextResponse.json(settings);
    } catch (e) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const settings = await prisma.settings.findMany();
        // Convert array of {key, value} to an object {key: value}
        const settingsObj = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {} as Record<string, string>);

        return NextResponse.json({ success: true, data: settingsObj });
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Body is expected to be an object: { CODA_API_TOKEN: "val", ... }
        const updatePromises = Object.entries(body).map(([key, value]) => {
            if (typeof value !== 'string') return Promise.resolve();
            return prisma.settings.upsert({
                where: { key },
                update: { value },
                create: { key, value },
            });
        });

        await Promise.all(updatePromises);

        return NextResponse.json({ success: true, message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Error saving settings:', error);
        return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
    }
}

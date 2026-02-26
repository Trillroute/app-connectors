import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    let payload;
    try {
        payload = await request.json();
    } catch (e) {
        return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    try {
        // 1. Log webhook in SQLite Database instantly so we can inspect the schema on the dashboard
        const logEntry = await prisma.webhookLog.create({
            data: {
                source: 'coda-sync-dev', // Using a dev tag so we know it's just for schema inspection
                payload: JSON.stringify(payload, null, 2),
                status: 'success',
                action: 'Schema Logged for Dev Inspection'
            }
        });

        // We aren't doing any real syncing yet. 
        // We just want to capture the exact JSON payload the Coda table exposes.
        return NextResponse.json({ success: true, message: 'Schema logged successfully. Ready for inspection.', logId: logEntry.id });

    } catch (error: any) {
        console.error('Coda Sync Dev Webhook error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

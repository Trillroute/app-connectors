import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Settings } from '@prisma/client';
import { sendGallaboxMessage } from '@/lib/services/gallabox';

export async function POST(request: Request) {
    let payload;
    try {
        payload = await request.json();
    } catch (e) {
        return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    // 1. Log webhook in SQLite Database instantly
    const logEntry = await prisma.webhookLog.create({
        data: {
            source: 'coda',
            payload: JSON.stringify(payload),
            status: 'pending',
        }
    });

    try {
        // Fetch Configuration Settings
        const settings = await prisma.settings.findMany({
            where: { key: { in: ['GALLABOX_ENQUIRY_TEMPLATE', 'AUTOMATION_CODA_ENABLED'] } }
        });

        const settingsMap = settings.reduce((acc: Record<string, string>, curr: Settings) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {} as Record<string, string>);

        const ENQUIRY_TEMPLATE = settingsMap['GALLABOX_ENQUIRY_TEMPLATE'] || 'new_enquiry_alert';
        const IS_ENABLED = settingsMap['AUTOMATION_CODA_ENABLED'] !== 'false';

        if (!IS_ENABLED) {
            await updateLog(logEntry.id, 'success', 'Skipped - Automation Disabled');
            return NextResponse.json({ success: true, message: 'Webhook skipped (Automation Disabled)' });
        }

        // Extract Name and Phone from the Coda JSON payload
        // We will assume the Coda Automation passes: { "name": "John", "phone": "9876543210" }
        const { name, phone } = payload;

        if (!phone) {
            await updateLog(logEntry.id, 'failed', 'Missing "phone" in Coda JSON payload');
            return NextResponse.json({ success: false, error: 'Missing phone number' }, { status: 400 });
        }

        // Format phone number
        const formattedNumber = phone.startsWith('+') ? phone : `+91${phone}`;
        const recipientName = name || 'Customer';

        // Use the same native Gallabox template format structure we discovered earlier
        const templateData = {
            bodyValues: {
                "variable_1": recipientName
            },
            buttonValues: [] // Empty if no buttons are needed, or could be mapped dynamically if needed
        };

        const gallaboxResult = await sendGallaboxMessage(ENQUIRY_TEMPLATE, formattedNumber, recipientName, templateData);

        if (!gallaboxResult.success) {
            await updateLog(logEntry.id, 'failed', `Gallabox Error: ${gallaboxResult.error}`);
            return NextResponse.json({ success: false, error: gallaboxResult.error });
        }

        await updateLog(logEntry.id, 'success', 'Gallabox Notification Sent');
        return NextResponse.json({ success: true, message: 'Enquiry processed and WhatsApp sent' });

    } catch (error: any) {
        console.error('Coda Webhook error:', error);
        await updateLog(logEntry.id, 'failed', `System Error: ${error.message}`);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

async function updateLog(id: string, status: string, errorOrAction: string) {
    await prisma.webhookLog.update({
        where: { id },
        data: {
            status: status,
            error: status === 'failed' ? errorOrAction : null,
            action: status === 'success' ? errorOrAction : undefined
        }
    });
}

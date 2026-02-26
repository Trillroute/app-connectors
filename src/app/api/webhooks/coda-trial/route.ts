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
            source: 'coda-trial',
            payload: JSON.stringify(payload),
            status: 'pending',
        }
    });

    try {
        // Fetch Configuration Settings
        const settings = await prisma.settings.findMany({
            where: { key: { in: ['GALLABOX_TRIAL_CLASS_TEMPLATE', 'AUTOMATION_TRIAL_CLASS_ENABLED'] } }
        });

        const settingsMap = settings.reduce((acc: Record<string, string>, curr: Settings) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {} as Record<string, string>);

        const TRIAL_TEMPLATE = settingsMap['GALLABOX_TRIAL_CLASS_TEMPLATE'] || 'trial_class_booking_confirmation_no_profile';
        const IS_ENABLED = settingsMap['AUTOMATION_TRIAL_CLASS_ENABLED'] !== 'false';

        if (!IS_ENABLED) {
            await updateLog(logEntry.id, 'success', 'Skipped - Automation Disabled');
            return NextResponse.json({ success: true, message: 'Webhook skipped (Automation Disabled)' });
        }

        // Extract parameters from the Coda JSON payload
        const { name, phone, variable_2, variable_3, variable_4, variable_5, variable_6 } = payload;

        if (!phone) {
            await updateLog(logEntry.id, 'failed', 'Missing "phone" in Coda JSON payload');
            return NextResponse.json({ success: false, error: 'Missing phone number' }, { status: 400 });
        }

        // Format phone number
        const formattedNumber = phone.startsWith('+') ? phone : `+91${phone}`;
        const recipientName = name || 'Student';

        // Ensure we pass the dynamic template exactly as the Gallabox structure dictates
        const templateData: any = {
            bodyValues: {
                "name": recipientName,
                "variable_2": variable_2 || "",
                "variable_3": variable_3 || "",
                "variable_4": variable_4 || "",
                "variable_5": variable_5 || "",
                "variable_6": variable_6 || ""
            }
        };

        // If the channel mapping differs, we override it here conceptually,
        // but sendGallaboxMessage will use default channel logic unless modified.
        const gallaboxResult = await sendGallaboxMessage(TRIAL_TEMPLATE, formattedNumber, recipientName, templateData);

        if (!gallaboxResult.success) {
            await updateLog(logEntry.id, 'failed', `Gallabox Error: ${gallaboxResult.error}`);
            return NextResponse.json({ success: false, error: gallaboxResult.error });
        }

        await updateLog(logEntry.id, 'success', 'Gallabox Trial Confirmation Sent');
        return NextResponse.json({ success: true, message: 'Trial Class processed and WhatsApp sent' });

    } catch (error: any) {
        console.error('Coda Trial webhook error:', error);
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

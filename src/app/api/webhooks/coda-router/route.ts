import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendGallaboxMessage } from '@/lib/services/gallabox';

export async function POST(request: Request) {
    let payload;
    try {
        payload = await request.json();
    } catch (e) {
        return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { eventType, phone, payloadJson } = payload;

    if (!eventType) {
        return NextResponse.json({ success: false, error: 'Missing eventType in payload' }, { status: 400 });
    }

    let parsedVariables: Record<string, any> = {};
    if (payloadJson) {
        try {
            parsedVariables = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
        } catch (e) {
            return NextResponse.json({ success: false, error: 'Invalid payloadJson format' }, { status: 400 });
        }
    }

    // Determine the source for UI logging backwards compatibility
    let source = `coda-router-${eventType}`;
    if (eventType === 'Enquiry') source = 'coda';
    if (eventType === 'TrialBooking' || eventType === 'Trial Booking Confirmation') source = 'coda-trial';

    // 1. Log webhook in SQLite Database instantly
    const logEntry = await prisma.webhookLog.create({
        data: {
            source: source,
            payload: JSON.stringify(payload),
            status: 'pending',
        }
    });

    try {
        // Fetch Configuration Settings for all possible Coda endpoints
        const settings = await prisma.settings.findMany({
            where: { key: { in: ['GALLABOX_ENQUIRY_TEMPLATE', 'AUTOMATION_CODA_ENABLED', 'GALLABOX_TRIAL_CLASS_TEMPLATE', 'AUTOMATION_TRIAL_CLASS_ENABLED'] } }
        });

        const settingsMap = settings.reduce((acc: Record<string, string>, curr: { key: string; value: string }) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {} as Record<string, string>);

        if (!phone) {
            await updateLog(logEntry.id, 'failed', 'Missing "phone" in Coda JSON payload');
            return NextResponse.json({ success: false, error: 'Missing phone number' }, { status: 400 });
        }

        const formattedNumber = phone.startsWith('+') ? phone : `+91${phone}`;

        // === ROUTING LOGIC ===
        if (eventType === 'Enquiry') {
            const ENQUIRY_TEMPLATE = settingsMap['GALLABOX_ENQUIRY_TEMPLATE'] || 'new_enquiry_alert';
            const IS_ENABLED = settingsMap['AUTOMATION_CODA_ENABLED'] !== 'false';

            if (!IS_ENABLED) {
                await updateLog(logEntry.id, 'success', 'Skipped - Automation Disabled');
                return NextResponse.json({ success: true, message: 'Webhook skipped (Automation Disabled)' });
            }

            const recipientName = parsedVariables.name || 'Customer';
            const templateData = {
                bodyValues: {
                    "variable_1": recipientName
                },
                buttonValues: []
            };

            const gallaboxResult = await sendGallaboxMessage(ENQUIRY_TEMPLATE, formattedNumber, templateData);

            if (!gallaboxResult.success) {
                await updateLog(logEntry.id, 'failed', `Gallabox Error: ${gallaboxResult.error}`);
                return NextResponse.json({ success: false, error: gallaboxResult.error });
            }

            await updateLog(logEntry.id, 'success', 'Gallabox Notification Sent');
            return NextResponse.json({ success: true, message: 'Enquiry processed and WhatsApp sent' });

        } else if (eventType === 'TrialBooking' || eventType === 'Trial Booking Confirmation') {
            const TRIAL_TEMPLATE = settingsMap['GALLABOX_TRIAL_CLASS_TEMPLATE'] || 'trial_class_booking_confirmation_no_profile';
            const IS_ENABLED = settingsMap['AUTOMATION_TRIAL_CLASS_ENABLED'] !== 'false';

            if (!IS_ENABLED) {
                await updateLog(logEntry.id, 'success', 'Skipped - Automation Disabled');
                return NextResponse.json({ success: true, message: 'Webhook skipped (Automation Disabled)' });
            }

            const recipientName = parsedVariables.name || 'Student';
            const templateData = {
                bodyValues: {
                    "variable_1": recipientName,
                    "variable_2": parsedVariables.variable_2 || "",
                    "variable_3": parsedVariables.variable_3 || "",
                    "variable_4": parsedVariables.variable_4 || "",
                    "variable_5": parsedVariables.variable_5 || "",
                    "variable_6": parsedVariables.variable_6 || ""
                },
                buttonValues: []
            };

            const gallaboxResult = await sendGallaboxMessage(TRIAL_TEMPLATE, formattedNumber, templateData);

            if (!gallaboxResult.success) {
                await updateLog(logEntry.id, 'failed', `Gallabox Error: ${gallaboxResult.error}`);
                return NextResponse.json({ success: false, error: gallaboxResult.error });
            }

            await updateLog(logEntry.id, 'success', 'Gallabox Trial Confirmation Sent');
            return NextResponse.json({ success: true, message: 'Trial Class processed and WhatsApp sent' });

        } else {
            // Future unhandled event types just gracefully sit in the DB
            await updateLog(logEntry.id, 'success', `Logged unsupported eventType: ${eventType}`);
            return NextResponse.json({ success: true, message: `Event ${eventType} logged but no dispatcher configured` });
        }

    } catch (error: any) {
        console.error('Coda Router Webhook error:', error);
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

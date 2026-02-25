import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Settings } from '@prisma/client';
import { insertCodaRow } from '@/lib/services/coda';
import { sendGallaboxMessage } from '@/lib/services/gallabox';

async function processExotelWebhook(payload: any) {
    // Fetch Configuration Settings from DB
    const settings = await prisma.settings.findMany({
        where: { key: { in: ['CODA_CALL_LOGS_TABLE', 'GALLABOX_MISSED_CALL_TEMPLATE', 'AUTOMATION_EXOTEL_ENABLED'] } }
    });

    const settingsMap = settings.reduce((acc: Record<string, string>, curr: Settings) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {} as Record<string, string>);

    const CODA_CALL_LOGS_TABLE = settingsMap['CODA_CALL_LOGS_TABLE'] || 'CallLogs';
    const MISSED_CALL_TEMPLATE = settingsMap['GALLABOX_MISSED_CALL_TEMPLATE'] || 'missed_call_alert';
    const IS_ENABLED = settingsMap['AUTOMATION_EXOTEL_ENABLED'] !== 'false';

    try {
        // Extract relevant fields sent by Exotel (Modify according to exact Exotel Docs)
        // Note: For Passthru applets, Exotel might not send a status. We default to 'missed' for this use case.
        const exotelStatus = payload.Status || payload.CallStatus || payload.DialCallStatus;
        const callStatus = (!exotelStatus || exotelStatus === "null") ? (payload.CallType || 'missed') : exotelStatus;
        const fromNumber = payload.From || payload.Caller || payload.CallFrom;
        const callDuration = payload.Duration || payload.DialCallDuration || '0';

        // 2. Log webhook in SQLite Database (so if an API fails, we don't lose the record)
        const logEntry = await prisma.webhookLog.create({
            data: {
                source: 'exotel',
                payload: JSON.stringify(payload),
                status: 'pending',
            }
        });

        if (!IS_ENABLED) {
            await prisma.webhookLog.update({
                where: { id: logEntry.id },
                data: { status: 'success', action: 'Skipped - Automation Disabled' }
            });
            return NextResponse.json({ success: true, message: 'Webhook skipped (Automation Disabled)' });
        }

        let actionErrors = [];
        let gallaboxStatusStr = "Skipped";

        // 3. If Call is missed, send WhatsApp message via Gallabox FIRST to get the status
        if (callStatus && (callStatus.toLowerCase() === 'missed' || callStatus.toLowerCase() === 'no-answer' || callStatus.toLowerCase() === 'call-attempt')) {
            // Exotel numbers usually have country codes. Format accordingly.
            const formattedNumber = fromNumber.startsWith('+') ? fromNumber : `+91${fromNumber}`;

            // Configure template variables using Gallabox's native bodyValues format
            const templateData = {
                bodyValues: {
                    "variable_1": "Customer"
                },
                buttonValues: [
                    {
                        index: 0,
                        sub_type: "quick_reply",
                        parameters: {
                            type: "payload",
                            payload: "Reschedule Call"
                        }
                    }
                ]
            };

            const gallaboxResult = await sendGallaboxMessage(MISSED_CALL_TEMPLATE, formattedNumber, "Customer", templateData);

            if (!gallaboxResult.success) {
                actionErrors.push(`Gallabox Error: ${gallaboxResult.error}`);
                gallaboxStatusStr = "Failed";
            } else {
                gallaboxStatusStr = "Sent";
            }
        }

        // 4. Log Call inside Coda.io
        // Ensure that the Coda table has these exact column names.
        const codaResult = await insertCodaRow(CODA_CALL_LOGS_TABLE, {
            "Phone Number": fromNumber,
            "Status": callStatus === 'call-attempt' ? 'missed' : callStatus,
            "Duration": callDuration,
            "Date": new Date().toISOString(),
            "Gallabox Status": gallaboxStatusStr,
            "Message Template": gallaboxStatusStr !== "Skipped" ? MISSED_CALL_TEMPLATE : ""
        });

        if (!codaResult.success) {
            actionErrors.push(`Coda Error: ${codaResult.error}`);
        }

        // 5. Update Log Status
        await prisma.webhookLog.update({
            where: { id: logEntry.id },
            data: {
                status: actionErrors.length > 0 ? 'failed' : 'success',
                error: actionErrors.length > 0 ? actionErrors.join(' | ') : null,
                action: gallaboxStatusStr !== "Skipped" ? 'Coda + Gallabox Webhook Sent' : 'Coda Insert'
            }
        });

        return NextResponse.json({ success: true, message: 'Webhook processed' });
    } catch (error: any) {
        console.error('Webhook error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const payloadBuffer = await request.text();
        let payload;
        try {
            payload = JSON.parse(payloadBuffer);
        } catch (e) {
            const params = new URLSearchParams(payloadBuffer);
            payload = Object.fromEntries(params.entries());
        }
        return await processExotelWebhook(payload);
    } catch (error: any) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const payload = Object.fromEntries(searchParams.entries());
        return await processExotelWebhook(payload);
    } catch (error: any) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

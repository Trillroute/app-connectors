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

    let parsedVariables: Record<string, any> = { ...payload };
    if (payloadJson) {
        try {
            const parsed = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
            parsedVariables = { ...parsedVariables, ...parsed };
        } catch (e) {
            return NextResponse.json({ success: false, error: 'Invalid payloadJson format' }, { status: 400 });
        }
    }

    // Determine the source for UI logging backwards compatibility
    let source = `coda-router-${eventType}`;
    if (eventType === 'Enquiry') source = 'coda';
    if (eventType === 'TrialBooking' || eventType === 'Trial Booking Confirmation') source = 'coda-trial';
    if (eventType === 'AdmissionConfirmation') source = 'coda-admission';
    if (eventType === 'PolicyOverview') source = 'coda-policy';

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
            where: { key: { in: ['GALLABOX_ENQUIRY_TEMPLATE', 'AUTOMATION_CODA_ENABLED', 'GALLABOX_TRIAL_CLASS_TEMPLATE', 'AUTOMATION_TRIAL_CLASS_ENABLED', 'GALLABOX_ADMISSION_TEMPLATE', 'AUTOMATION_ADMISSION_ENABLED', 'GALLABOX_POLICY_OVERVIEW_TEMPLATE', 'AUTOMATION_POLICY_OVERVIEW_ENABLED'] } }
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
            const templateData: any = {
                bodyValues: {
                    "variable_1": recipientName
                }
            };

            const gallaboxResult = await sendGallaboxMessage(ENQUIRY_TEMPLATE, formattedNumber, recipientName, templateData);

            if (!gallaboxResult.success) {
                await updateLog(logEntry.id, 'failed', `Gallabox Error: ${gallaboxResult.error}`, payload, gallaboxResult.payloadSent);
                return NextResponse.json({ success: false, error: gallaboxResult.error });
            }

            await updateLog(logEntry.id, 'success', 'Gallabox Notification Sent', payload, gallaboxResult.payloadSent);
            return NextResponse.json({ success: true, message: 'Enquiry processed and WhatsApp sent' });

        } else if (eventType === 'TrialBooking' || eventType === 'Trial Booking Confirmation') {
            const TRIAL_TEMPLATE = settingsMap['GALLABOX_TRIAL_CLASS_TEMPLATE'] || 'trial_class_booking_confirmation_no_profile';
            const IS_ENABLED = settingsMap['AUTOMATION_TRIAL_CLASS_ENABLED'] !== 'false';

            if (!IS_ENABLED) {
                await updateLog(logEntry.id, 'success', 'Skipped - Automation Disabled');
                return NextResponse.json({ success: true, message: 'Webhook skipped (Automation Disabled)' });
            }

            const recipientName = parsedVariables.name || 'Student';
            const templateData: any = {
                bodyValues: {
                    "name": recipientName,
                    "variable_2": parsedVariables.variable_2 || "",
                    "variable_3": parsedVariables.variable_3 || "",
                    "variable_4": parsedVariables.variable_4 || "",
                    "variable_5": parsedVariables.variable_5 || "",
                    "variable_6": parsedVariables.variable_6 || ""
                }
            };

            const gallaboxResult = await sendGallaboxMessage(TRIAL_TEMPLATE, formattedNumber, recipientName, templateData);

            if (!gallaboxResult.success) {
                await updateLog(logEntry.id, 'failed', `Gallabox Error: ${gallaboxResult.error}`, payload, gallaboxResult.payloadSent);
                return NextResponse.json({ success: false, error: gallaboxResult.error });
            }

            await updateLog(logEntry.id, 'success', 'Gallabox Trial Confirmation Sent', payload, gallaboxResult.payloadSent);
            return NextResponse.json({ success: true, message: 'Trial Class processed and WhatsApp sent' });

        } else if (eventType === 'AdmissionConfirmation') {
            const ADMISSION_TEMPLATE = settingsMap['GALLABOX_ADMISSION_TEMPLATE'] || 'admission_sales_tracker_v4';
            const IS_ENABLED = settingsMap['AUTOMATION_ADMISSION_ENABLED'] !== 'false';

            if (!IS_ENABLED) {
                await updateLog(logEntry.id, 'success', 'Skipped - Automation Disabled');
                return NextResponse.json({ success: true, message: 'Webhook skipped (Automation Disabled)' });
            }

            const flattenValue = (val: any) => Array.isArray(val) ? val.join(', ') : (val || '');

            const recipientName = flattenValue(parsedVariables.name) || 'Student';
            const templateData: any = {
                bodyValues: {
                    "name": flattenValue(parsedVariables.name),
                    "location": flattenValue(parsedVariables.location),
                    "instrument": flattenValue(parsedVariables.instrument),
                    "mode": flattenValue(parsedVariables.mode),
                    "code": flattenValue(parsedVariables.code),
                    "slot_a": flattenValue(parsedVariables.slot_a),
                    "slot_b": flattenValue(parsedVariables.slot_b),
                    "trainer": flattenValue(parsedVariables.trainer),
                    "start_date": flattenValue(parsedVariables.start_date),
                    "end_date": flattenValue(parsedVariables.end_date)
                }
            };

            const gallaboxResult = await sendGallaboxMessage(ADMISSION_TEMPLATE, formattedNumber, recipientName, templateData);

            if (!gallaboxResult.success) {
                await updateLog(logEntry.id, 'failed', `Gallabox Error: ${gallaboxResult.error}`, payload, gallaboxResult.payloadSent);
                return NextResponse.json({ success: false, error: gallaboxResult.error });
            }

            await updateLog(logEntry.id, 'success', 'Gallabox Admission Confirmation Sent', payload, gallaboxResult.payloadSent);
            return NextResponse.json({ success: true, message: 'Admission Confirmation processed and WhatsApp sent' });

        } else if (eventType === 'PolicyOverview') {
            const POLICY_TEMPLATE = settingsMap['GALLABOX_POLICY_OVERVIEW_TEMPLATE'] || 'policy_overview_for_admission';
            const IS_ENABLED = settingsMap['AUTOMATION_POLICY_OVERVIEW_ENABLED'] !== 'false';

            if (!IS_ENABLED) {
                await updateLog(logEntry.id, 'success', 'Skipped - Automation Disabled');
                return NextResponse.json({ success: true, message: 'Webhook skipped (Automation Disabled)' });
            }

            const flattenValue = (val: any) => Array.isArray(val) ? val.join(', ') : (val || '');

            const recipientName = flattenValue(parsedVariables.name) || 'Student';
            const templateData: any = {
                bodyValues: {
                    "variable_name": flattenValue(parsedVariables.variable_name || parsedVariables.name),
                    "variable_plan": flattenValue(parsedVariables.variable_plan || parsedVariables.plan),
                    "variable_reservation": flattenValue(parsedVariables.variable_reservation || parsedVariables.reservation),
                    "variable_cancellation": flattenValue(parsedVariables.variable_cancellation || parsedVariables.cancellation),
                    "variable_holiday1": flattenValue(parsedVariables.variable_holiday1 || parsedVariables.holiday1),
                    "variable_holiday2": flattenValue(parsedVariables.variable_holiday2 || parsedVariables.holiday2)
                }
            };

            const gallaboxResult = await sendGallaboxMessage(POLICY_TEMPLATE, formattedNumber, recipientName, templateData);

            if (!gallaboxResult.success) {
                await updateLog(logEntry.id, 'failed', `Gallabox Error: ${gallaboxResult.error}`, payload, gallaboxResult.payloadSent);
                return NextResponse.json({ success: false, error: gallaboxResult.error });
            }

            await updateLog(logEntry.id, 'success', 'Gallabox Policy Overview Sent', payload, gallaboxResult.payloadSent);
            return NextResponse.json({ success: true, message: 'Policy Overview processed and WhatsApp sent' });

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

async function updateLog(id: string, status: string, errorOrAction: string, incomingPayload?: any, outgoingPayload?: any) {
    const dataToUpdate: any = {
        status: status,
        error: status === 'failed' ? errorOrAction : null,
        action: status === 'success' ? errorOrAction : undefined
    };

    if (incomingPayload && outgoingPayload) {
        dataToUpdate.payload = JSON.stringify({
            INCOMING_WEBHOOK: incomingPayload,
            OUTGOING_GALLABOX: outgoingPayload
        }, null, 2);
    }

    await prisma.webhookLog.update({
        where: { id },
        data: dataToUpdate
    });
}

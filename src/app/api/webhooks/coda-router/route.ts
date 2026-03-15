import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendGallaboxMessage } from '@/lib/services/gallabox';
import { makeExotelCall } from '@/lib/services/exotel';

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
            where: { key: { in: ['GALLABOX_ENQUIRY_TEMPLATE', 'AUTOMATION_CODA_ENABLED', 'GALLABOX_TRIAL_CLASS_TEMPLATE', 'AUTOMATION_TRIAL_CLASS_ENABLED', 'GALLABOX_ADMISSION_TEMPLATE', 'AUTOMATION_ADMISSION_ENABLED', 'GALLABOX_POLICY_OVERVIEW_TEMPLATE', 'AUTOMATION_POLICY_OVERVIEW_ENABLED', 'GALLABOX_NEW_ACCOUNT_TEMPLATE', 'AUTOMATION_NEW_ACCOUNT_ENABLED'] } }
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
        const flattenValue = (val: any) => {
            const flat = Array.isArray(val) ? val.join(', ') : String(val || '');
            const trimmed = flat.trim();
            return trimmed === '' ? '-' : trimmed;
        };

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

            const recipientName = flattenValue(parsedVariables.name) || 'Student';
            const templateData: any = {
                bodyValues: {
                    "name": flattenValue(parsedVariables.variable_name || parsedVariables.name),
                    "plan": flattenValue(parsedVariables.variable_plan || parsedVariables.plan),
                    "reservation": flattenValue(parsedVariables.variable_reservation || parsedVariables.reservation),
                    "cancellation": flattenValue(parsedVariables.variable_cancellation || parsedVariables.cancellation),
                    "holiday": flattenValue(
                        parsedVariables.holiday || parsedVariables.variable_holiday ||
                        ((parsedVariables.variable_holiday1 || parsedVariables.holiday1 || '') +
                            (parsedVariables.variable_holiday2 || parsedVariables.holiday2 || ''))
                    )
                }
            };

            const gallaboxResult = await sendGallaboxMessage(POLICY_TEMPLATE, formattedNumber, recipientName, templateData);

            if (!gallaboxResult.success) {
                await updateLog(logEntry.id, 'failed', `Gallabox Error: ${gallaboxResult.error}`, payload, gallaboxResult.payloadSent);
                return NextResponse.json({ success: false, error: gallaboxResult.error });
            }

            await updateLog(logEntry.id, 'success', 'Gallabox Policy Overview Sent', payload, gallaboxResult.payloadSent);
            return NextResponse.json({ success: true, message: 'Policy Overview processed and WhatsApp sent' });

        } else if (eventType === 'NewAccount') {
            await prisma.webhookLog.update({ where: { id: logEntry.id }, data: { source: 'coda-new-account' } });

            const NEW_ACCOUNT_TEMPLATE = settingsMap['GALLABOX_NEW_ACCOUNT_TEMPLATE'] || 'new_account_created_createnextapp_1';
            const IS_ENABLED = settingsMap['AUTOMATION_NEW_ACCOUNT_ENABLED'] !== 'false';

            if (!IS_ENABLED) {
                await updateLog(logEntry.id, 'success', 'Skipped - Automation Disabled');
                return NextResponse.json({ success: true, message: 'Webhook skipped (Automation Disabled)' });
            }

            const recipientName = flattenValue(parsedVariables.name) || 'Customer';
            const templateData: any = {
                bodyValues: {
                    "name": flattenValue(parsedVariables.name || parsedVariables.variable_name)
                }
            };

            const gallaboxResult = await sendGallaboxMessage(NEW_ACCOUNT_TEMPLATE, formattedNumber, recipientName, templateData);

            if (!gallaboxResult.success) {
                await updateLog(logEntry.id, 'failed', `Gallabox Error: ${gallaboxResult.error}`, payload, gallaboxResult.payloadSent);
                return NextResponse.json({ success: false, error: gallaboxResult.error });
            }

            await updateLog(logEntry.id, 'success', 'Gallabox New Account Notice Sent', payload, gallaboxResult.payloadSent);
            return NextResponse.json({ success: true, message: 'New Account processed and WhatsApp sent' });

        } else {
            // Check if this eventType matches a Custom Automation from the UI Builder
            const customAuto = await (prisma as any).customAutomation.findUnique({
                where: { triggerEventType: eventType }
            });

            if (customAuto && customAuto.isActive) {
                await prisma.webhookLog.update({ where: { id: logEntry.id }, data: { source: `coda-custom-${customAuto.name.replace(/\s+/g, '-').toLowerCase()}` } });

                try {
                    const mappings = JSON.parse(customAuto.variableMappings || '[]');
                    const bodyValues: Record<string, string> = {};
                    const buttonValues: any[] = [];

                    mappings.forEach((m: { templateVar: string; codaField: string }) => {
                        // Extract value from parsedVariables based on mapped Coda field key
                        const extracted = flattenValue(parsedVariables[m.codaField] || parsedVariables[`variable_${m.codaField}`] || parsedVariables[m.codaField.toLowerCase()]);
                        if (extracted) {
                            // Check if the user is mapping to a Gallabox Button array parameter (e.g. button_0)
                            if (m.templateVar.startsWith('button_')) {
                                const index = m.templateVar.replace('button_', '');
                                buttonValues.push({
                                    index: parseInt(index, 10),
                                    sub_type: "url",
                                    parameters: {
                                        type: "text",
                                        text: extracted
                                    }
                                });
                            } else {
                                bodyValues[m.templateVar] = extracted;
                            }
                        }
                    });

                    const templateData: any = { bodyValues };
                    if (buttonValues.length > 0) {
                        templateData.buttonValues = buttonValues;
                    }
                    if (customAuto.actionType === 'exotel_call') {
                        // For Exotel, we expect 'From', 'To', and 'CallerId' to be mapped in bodyValues
                        const from = bodyValues['From'] || bodyValues['from'];
                        const to = bodyValues['To'] || bodyValues['to'];
                        const callerId = bodyValues['CallerId'] || bodyValues['callerId'] || bodyValues['callerid'];

                        if (!from || !to || !callerId) {
                            throw new Error(`Exotel Call requires 'From', 'To', and 'CallerId' variable mappings. Found: ${JSON.stringify(bodyValues)}`);
                        }

                        // Dispatch to Exotel
                        const response = await makeExotelCall(from, to, callerId);

                        await prisma.webhookLog.update({
                            where: { id: logEntry.id },
                            data: {
                                status: 'success',
                                action: `Connected Exotel Call: ${from} -> ${to}`,
                                payload: JSON.stringify({ codaPayload: bodyValues, exotelPlatformResponse: response })
                            }
                        });
                        return NextResponse.json({ success: true, message: 'Custom Exotel Call Automation Dispatched successfully.' });

                    } else {
                        // Default to Gallabox Message Execution
                        // Attempt to extract a generic name to appease the recipient struct requirement
                        const recipientName = flattenValue(parsedVariables['studentName'] || parsedVariables['customerName'] || parsedVariables['name'] || "Customer");
                        const recipientPhone = flattenValue(parsedVariables['whatsappContact'] || parsedVariables['phone'] || parsedVariables['phoneNumber']);

                        if (!recipientPhone) {
                            throw new Error("Phone number mapping not found in payload for Gallabox Message. E.g. Missing `whatsappContact` or `phone` key in root mapping block.");
                        }

                        // Dispatch to Gallabox
                        const gallaboxResult = await sendGallaboxMessage(customAuto.gallaboxTemplateName, recipientPhone, recipientName, templateData);

                        if (!gallaboxResult.success) {
                            await updateLog(logEntry.id, 'failed', `Gallabox Error: ${gallaboxResult.error}`, payload, gallaboxResult.payloadSent);
                            return NextResponse.json({ success: false, error: gallaboxResult.error });
                        }

                        await updateLog(logEntry.id, 'success', `Gallabox Custom Auto Details Sent: ${customAuto.name}`, payload, gallaboxResult.payloadSent);
                        return NextResponse.json({ success: true, message: `Custom Automation [${customAuto.name}] processed successfully` });
                    }
                } catch (error: any) {
                    await updateLog(logEntry.id, 'failed', `Custom Mapping Extraction Parse Error: ${error.message}`, payload);
                    return NextResponse.json({ success: false, error: `Custom Auto JSON Exception: ${error.message}` });
                }
            } else {
                // Future unhandled event types just gracefully sit in the DB
                await updateLog(logEntry.id, 'success', `Logged unsupported eventType: ${eventType}`);
                return NextResponse.json({ success: true, message: `Event ${eventType} logged but no dispatcher configured` });
            }
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

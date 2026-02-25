import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Settings } from '@prisma/client';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { integration } = body; // 'exotel', 'coda', or 'gallabox'

        if (!integration) {
            return NextResponse.json({ success: false, error: 'Integration type is required' }, { status: 400 });
        }

        // Fetch Configuration Settings from DB
        const settings = await prisma.settings.findMany();
        const settingsMap = settings.reduce((acc: Record<string, string>, curr: Settings) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {} as Record<string, string>);

        if (integration === 'exotel') {
            const sid = settingsMap['EXOTEL_SID'];
            const token = settingsMap['EXOTEL_TOKEN'];
            const apiKey = settingsMap['EXOTEL_API_KEY'];
            const subdomain = settingsMap['EXOTEL_SUBDOMAIN'];

            if (!sid || !token || !apiKey || !subdomain) {
                return NextResponse.json({ success: false, error: 'Missing Exotel credentials in settings.' });
            }

            // Exotel API requires Basic Auth with apiKey:token
            const authHeader = `Basic ${Buffer.from(`${apiKey}:${token}`).toString('base64')}`;
            const url = `https://${subdomain}/v1/Accounts/${sid}`; // Get Account Details endpoint

            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': authHeader
                }
            });

            if (res.ok) {
                return NextResponse.json({ success: true, message: 'Exotel connection successful!' });
            } else {
                const errorData = await res.text();
                return NextResponse.json({ success: false, error: `Exotel Auth Failed: ${res.status} ${res.statusText}`, details: errorData });
            }
        }

        else if (integration === 'coda') {
            const apiToken = settingsMap['CODA_API_TOKEN'];
            const docId = settingsMap['CODA_DOC_ID'];
            const tableId = settingsMap['CODA_CALL_LOGS_TABLE'];

            if (!apiToken || !docId || !tableId) {
                return NextResponse.json({ success: false, error: 'Missing Coda credentials in settings.' });
            }

            // Test Coda connection by fetching table metadata
            const url = `https://coda.io/apis/v1/docs/${docId}/tables/${tableId}`;
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiToken}`
                }
            });

            if (res.ok) {
                return NextResponse.json({ success: true, message: 'Coda connection successful!' });
            } else {
                const errorData = await res.text();
                return NextResponse.json({ success: false, error: `Coda Auth Failed: ${res.status} ${res.statusText}`, details: errorData });
            }
        }

        else if (integration === 'gallabox') {
            const apiKey = settingsMap['GALLABOX_API_KEY'];
            const accountId = settingsMap['GALLABOX_ACCOUNT_ID'];

            if (!apiKey || !accountId) {
                return NextResponse.json({ success: false, error: 'Missing Gallabox credentials in settings.' });
            }

            // Test Gallabox connection by sending an empty POST to the messages endpoint
            // If credentials are valid, it will return 400 Bad Request (Invalid Input).
            // If credentials are invalid, it will return 401 Unauthorized.
            const url = `https://server.gallabox.com/devapi/messages/whatsapp`;
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'apiKey': apiKey,
                    'apiSecret': accountId,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (res.status === 400 || res.status === 422) {
                return NextResponse.json({ success: true, message: 'Gallabox connection successful!' });
            } else {
                const errorData = await res.text();
                return NextResponse.json({ success: false, error: `Gallabox Auth Failed: ${res.status} ${res.statusText}`, details: errorData });
            }
        }

        return NextResponse.json({ success: false, error: 'Unknown integration type' }, { status: 400 });

    } catch (error: any) {
        console.error('Test API error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

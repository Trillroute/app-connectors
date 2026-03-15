import prisma from '@/lib/prisma';

export async function makeExotelCall(from: string, to: string, callerId: string) {
    // 1. Fetch credentials from DB dynamically
    const settingsRecords = await prisma.settings.findMany({
        where: { key: { in: ['EXOTEL_SID', 'EXOTEL_TOKEN', 'EXOTEL_API_KEY', 'EXOTEL_SUBDOMAIN'] } }
    });

    const settingsMap = settingsRecords.reduce((acc: Record<string, string>, curr: { key: string, value: string }) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {} as Record<string, string>);

    const sid = settingsMap['EXOTEL_SID'];
    const token = settingsMap['EXOTEL_TOKEN'];
    const apiKey = settingsMap['EXOTEL_API_KEY'];
    const subdomain = settingsMap['EXOTEL_SUBDOMAIN'] || 'api.exotel.com';

    if (!sid || !token || !apiKey) {
        throw new Error('Missing Exotel API credentials in Settings.');
    }

    // 2. Prepare the Exotel API Request
    const url = `https://${subdomain}/v1/Accounts/${sid}/Calls/connect.json`;
    const authString = Buffer.from(`${apiKey}:${token}`).toString('base64');

    const params = new URLSearchParams();
    params.append('From', from);
    params.append('To', to);
    params.append('CallerId', callerId);

    // 3. Dispatch the POST Request
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Exotel Call Error Response:', data);
            throw new Error(`Exotel API Error [${response.status}]: ${data.Message || JSON.stringify(data)}`);
        }

        return data; // Request was successfully accepted by Exotel
    } catch (error: any) {
        console.error("Exotel Call Connectivity Exception:", error);
        throw new Error('Failed to reach Exotel servers: ' + error.message);
    }
}

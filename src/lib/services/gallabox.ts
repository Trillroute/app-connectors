import prisma from '@/lib/prisma';
import { Settings } from '@prisma/client';

export async function sendGallaboxMessage(templateName: string, recipientPhone: string, templateData: any = {}) {
    const settings = await prisma.settings.findMany({
        where: { key: { in: ['GALLABOX_API_KEY', 'GALLABOX_ACCOUNT_ID', 'GALLABOX_CHANNEL_ID'] } }
    });

    const settingsMap = settings.reduce((acc: Record<string, string>, curr: Settings) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {} as Record<string, string>);

    const gallaboxApiKey = settingsMap['GALLABOX_API_KEY'];
    const gallaboxAccountId = settingsMap['GALLABOX_ACCOUNT_ID'];
    const channelId = settingsMap['GALLABOX_CHANNEL_ID'];

    if (!gallaboxApiKey || !gallaboxAccountId || !channelId) {
        console.error('Missing Gallabox API credentials in Settings Database.');
        return { success: false, error: 'Missing credentials' };
    }

    const url = `https://server.gallabox.com/devapi/messages/whatsapp`;

    const requestBody = {
        channelId: channelId,
        channelType: 'whatsapp',
        recipient: {
            phone: recipientPhone.replace('+', '')
        },
        whatsapp: {
            type: 'template',
            template: {
                templateName: templateName,
                ...templateData
            }
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'apiKey': gallaboxApiKey,
                'apiSecret': gallaboxAccountId, // Depending on authentication setup
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error sending Gallabox message:', errorText);
            return { success: false, error: errorText, payloadSent: requestBody };
        }

        const data = await response.json();
        return { success: true, data, payloadSent: requestBody };
    } catch (err: any) {
        console.error('Exception calling Gallabox API:', err);
        return { success: false, error: err.message, payloadSent: requestBody };
    }
}

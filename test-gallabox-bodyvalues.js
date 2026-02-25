const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.settings.findMany({
        where: { key: { in: ['GALLABOX_API_KEY', 'GALLABOX_ACCOUNT_ID', 'GALLABOX_CHANNEL_ID'] } }
    });
    const s = {};
    settings.forEach(x => s[x.key] = x.value);

    // Mocking the structure we just put into route.ts + gallabox.ts
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

    const payload = {
        channelId: s['GALLABOX_CHANNEL_ID'],
        channelType: 'whatsapp',
        recipient: { phone: '919447402340' },
        whatsapp: {
            type: 'template',
            template: {
                templateName: 'missed_call_createnextapp_3',
                ...templateData
            }
        }
    };

    console.log("Sending payload:", JSON.stringify(payload, null, 2));

    const res = await fetch('https://server.gallabox.com/devapi/messages/whatsapp', {
        method: 'POST',
        headers: {
            'apiKey': s['GALLABOX_API_KEY'],
            'apiSecret': s['GALLABOX_ACCOUNT_ID'],
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    console.log("Status:", res.status);
    console.log("Response:", await res.text());
}
main();

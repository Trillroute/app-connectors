const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.settings.findMany({
        where: { key: { in: ['GALLABOX_API_KEY', 'GALLABOX_ACCOUNT_ID', 'GALLABOX_CHANNEL_ID'] } }
    });
    const s = {};
    settings.forEach(x => s[x.key] = x.value);

    let url = `https://server.gallabox.com/devapi/messages/whatsapp`;

    const requestBody = {
        channelId: s['GALLABOX_CHANNEL_ID'],
        channelType: 'whatsapp',
        recipient: {
            name: "Varun Test",
            phone: "919447402340"
        },
        whatsapp: {
            type: 'template',
            template: {
                templateName: "new_account_created_createnextapp_1",
                bodyValues: {
                    "name": "Varun Test"
                }
            }
        }
    };

    console.log("Sending to Gallabox:", JSON.stringify(requestBody, null, 2));

    try {
        let res = await fetch(url, {
            method: 'POST',
            headers: {
                'apiKey': s['GALLABOX_API_KEY'],
                'apiSecret': s['GALLABOX_ACCOUNT_ID'],
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Response Body:", text);
    } catch (e) {
        console.error("Error:", e);
    }
}

main();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.settings.findMany({
        where: { key: { in: ['GALLABOX_API_KEY', 'GALLABOX_ACCOUNT_ID', 'GALLABOX_CHANNEL_ID'] } }
    });
    const s = {};
    settings.forEach(x => s[x.key] = x.value);

    console.log(`curl -X POST "https://server.gallabox.com/devapi/messages/whatsapp" \\
    -H "apiKey: ${s.GALLABOX_API_KEY}" \\
    -H "apiSecret: ${s.GALLABOX_ACCOUNT_ID}" \\
    -H "Content-Type: application/json" \\
    -d '{
        "channelId": "${s.GALLABOX_CHANNEL_ID}",
        "channelType": "whatsapp",
        "recipient": {
            "name": "Varun Test",
            "phone": "919447402340"
        },
        "whatsapp": {
            "type": "template",
            "template": {
                "templateName": "new_account_created_createnextapp_1",
                "bodyValues": {
                    "name": "Varun Test"
                }
            }
        }
    }'`);

    await prisma.$disconnect();
    process.exit(0);
}
main();

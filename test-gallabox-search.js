const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.settings.findMany({
        where: { key: { in: ['GALLABOX_API_KEY', 'GALLABOX_ACCOUNT_ID'] } }
    });
    const s = {};
    settings.forEach(x => s[x.key] = x.value);

    const accountId = s['GALLABOX_ACCOUNT_ID'];

    // Try paginated fetch
    let url = `https://server.gallabox.com/devapi/accounts/${accountId}/contacts`;
    let res = await fetch(url, {
        method: 'GET',
        headers: {
            'apiKey': s['GALLABOX_API_KEY'],
            'apiSecret': accountId
        }
    });

    console.log("Status:", res.status);
    console.log("Body:", await res.text());
}
main();

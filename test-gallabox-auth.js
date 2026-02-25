const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.settings.findMany({
        where: { key: { in: ['GALLABOX_API_KEY', 'GALLABOX_ACCOUNT_ID'] } }
    });
    const s = {};
    settings.forEach(x => s[x.key] = x.value);

    // Try to hit a base endpoint to see if it returns the account ID
    let url = `https://server.gallabox.com/devapi/verify`;
    let res = await fetch(url, {
        method: 'GET',
        headers: {
            'apiKey': s['GALLABOX_API_KEY'],
            'apiSecret': s['GALLABOX_ACCOUNT_ID']
        }
    });

    console.log("Verify Endpoint Status:", res.status);
    console.log("Body:", await res.text());

    let url2 = `https://server.gallabox.com/devapi/accounts`;
    let res2 = await fetch(url2, {
        method: 'GET',
        headers: {
            'apiKey': s['GALLABOX_API_KEY'],
            'apiSecret': s['GALLABOX_ACCOUNT_ID']
        }
    });

    console.log("Accounts Endpoint Status:", res2.status);
    console.log("Body:", await res2.text());
}
main();

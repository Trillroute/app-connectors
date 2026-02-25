const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.settings.findMany({
        where: { key: { in: ['GALLABOX_API_KEY', 'GALLABOX_ACCOUNT_ID'] } }
    });
    const s = {};
    settings.forEach(x => s[x.key] = x.value);

    // Try a few possible endpoints for fetching contacts
    const phone = '919447402340';
    
    console.log("Attempt 1: /devapi/contacts?phone=" + phone);
    let res = await fetch(`https://server.gallabox.com/devapi/contacts?phone=${phone}`, {
        method: 'GET',
        headers: {
            'apiKey': s['GALLABOX_API_KEY'],
            'apiSecret': s['GALLABOX_ACCOUNT_ID']
        }
    });
    console.log("Status:", res.status);
    console.log("Response:", await res.text());
}
main();

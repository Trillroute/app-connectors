const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.settings.findMany({
        where: { key: { in: ['CODA_API_TOKEN', 'CODA_DOC_ID', 'CODA_CALL_LOGS_TABLE'] } }
    });
    const s = {};
    settings.forEach(x => s[x.key] = x.value);

    let url = `https://coda.io/apis/v1/docs/${s['CODA_DOC_ID']}/tables/${s['CODA_CALL_LOGS_TABLE']}/rows`;
    let res = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${s['CODA_API_TOKEN']}`
        }
    });
    
    let list = await res.json();
    console.log("Total Coda Rows:", list.items ? list.items.length : list);
}
main();

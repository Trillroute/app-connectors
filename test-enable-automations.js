const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    await prisma.settings.upsert({
        where: { key: 'AUTOMATION_EXOTEL_ENABLED' },
        update: { value: 'true' },
        create: { key: 'AUTOMATION_EXOTEL_ENABLED', value: 'true' }
    });
    
    await prisma.settings.upsert({
        where: { key: 'AUTOMATION_CODA_ENABLED' },
        update: { value: 'true' },
        create: { key: 'AUTOMATION_CODA_ENABLED', value: 'true' }
    });
    
    console.log("Enabled both automations!");
}
main();

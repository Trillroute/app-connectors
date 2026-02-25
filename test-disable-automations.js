const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    await prisma.settings.upsert({
        where: { key: 'AUTOMATION_EXOTEL_ENABLED' },
        update: { value: 'false' },
        create: { key: 'AUTOMATION_EXOTEL_ENABLED', value: 'false' }
    });
    
    await prisma.settings.upsert({
        where: { key: 'AUTOMATION_CODA_ENABLED' },
        update: { value: 'false' },
        create: { key: 'AUTOMATION_CODA_ENABLED', value: 'false' }
    });
    
    console.log("Disabled both automations!");
}
main();

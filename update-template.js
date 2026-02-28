const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    await prisma.settings.upsert({
        where: { key: 'GALLABOX_ADMISSION_TEMPLATE' },
        update: { value: 'admission_confirmed_createnextapp2' },
        create: { key: 'GALLABOX_ADMISSION_TEMPLATE', value: 'admission_confirmed_createnextapp2' }
    });
    console.log('Database override successful');
}

main().catch(console.error).finally(() => prisma.$disconnect());

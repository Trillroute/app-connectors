import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const adminSettings = await prisma.adminSettings.findFirst();
    if (!adminSettings) {
        console.log("No settings found in the database. Exiting.");
        return;
    }

    let settingsMap: any = {};
    if (adminSettings.settingsJson) {
        settingsMap = JSON.parse(adminSettings.settingsJson);
    }

    settingsMap['GALLABOX_POLICY_OVERVIEW_TEMPLATE'] = 'policy_overview_for_admission_createnextapp';

    await prisma.adminSettings.update({
        where: { id: adminSettings.id },
        data: {
            settingsJson: JSON.stringify(settingsMap)
        }
    });

    console.log("Successfully updated settings to use policy_overview_for_admission_createnextapp");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

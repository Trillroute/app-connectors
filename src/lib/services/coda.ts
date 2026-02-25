import prisma from '@/lib/prisma';
import { Settings } from '@prisma/client';

export async function insertCodaRow(tableName: string, rowData: any) {
    const settings = await prisma.settings.findMany({
        where: { key: { in: ['CODA_API_TOKEN', 'CODA_DOC_ID'] } }
    });

    const settingsMap = settings.reduce((acc: Record<string, string>, curr: Settings) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {} as Record<string, string>);

    const codaApiToken = settingsMap['CODA_API_TOKEN'];
    const codaDocId = settingsMap['CODA_DOC_ID'];

    if (!codaApiToken || !codaDocId) {
        console.error('Missing Coda API credentials in Settings Database.');
        return { success: false, error: 'Missing credentials' };
    }

    // To insert a row into Coda, you typically need the Table ID or Name.
    // The endpoint is: POST https://coda.io/apis/v1/docs/{docId}/tables/{tableIdOrName}/rows

    const url = `https://coda.io/apis/v1/docs/${codaDocId}/tables/${tableName}/rows`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${codaApiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                rows: [
                    {
                        cells: Object.keys(rowData).map(key => ({
                            column: key,
                            value: rowData[key]
                        }))
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error inserting row into Coda:', errorText);
            return { success: false, error: errorText };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (err: any) {
        console.error('Exception calling Coda API:', err);
        return { success: false, error: err.message };
    }
}

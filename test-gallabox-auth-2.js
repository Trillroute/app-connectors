const { sendGallaboxMessage } = require('./src/lib/services/gallabox');

async function test() {
    console.log('Testing Gallabox Authentication...');

    // Test with specifically the New Account format to catch the format error
    const result = await sendGallaboxMessage(
        'new_account_created_createnextapp',
        '+919447402340',
        'Puja Test',
        {
            bodyValues: {
                "name": "Puja Test Formatting"
            }
        }
    );

    console.log(JSON.stringify(result, null, 2));
}

test();

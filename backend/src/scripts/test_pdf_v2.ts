const fs = require('fs');

async function runTest() {
    console.log('--- TESTING PDF PARSE V2 ---');
    try {
        const pdfLib = require('pdf-parse');
        console.log('Require returned type:', typeof pdfLib);
        console.log('Keys:', Object.keys(pdfLib));

        const pdfParser = typeof pdfLib === 'function' ? pdfLib : pdfLib.default;
        console.log('Resolved parser type:', typeof pdfParser);

        if (typeof pdfParser !== 'function') {
            console.error('CRITICAL: Parser is NOT a function');
            process.exit(1);
        }

        console.log('Parser IS a function. Trying to call it with dummy buffer...');

        // Create a minimal valid PDF header to avoid immediate "Not a PDF" error if possible, 
        // or just random buffer to see if it throws "Invalid PDF" (which means it tried to parse)
        const dummyBuffer = Buffer.from('%PDF-1.5\n%\n%%EOF');

        try {
            const result = await pdfParser(dummyBuffer);
            console.log('Parsed successfully (unexpected for dummy)');
            console.log('Text:', result.text);
        } catch (e: any) {
            console.log('Caught error during parse (EXPECTED if dummy):');
            console.log(e.message);
            if (e.message && (e.message.includes('Invalid PDF') || e.message.includes('metadata'))) {
                console.log('SUCCESS: Library is loaded and attempted to parse.');
            } else {
                console.log('UNKNOWN ERROR:', e);
            }
        }

    } catch (e) {
        console.error('Script failed:', e);
    }
}

runTest();

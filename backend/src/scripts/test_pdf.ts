const pdfLib = require('pdf-parse');

async function test() {
    console.log('--- TESTING PDF PARSE ---');
    console.log('Type:', typeof pdfLib);
    console.log('Keys:', Object.keys(pdfLib));

    const pdfParser = typeof pdfLib === 'function' ? pdfLib : pdfLib.default;
    console.log('Resolved Parser Type:', typeof pdfParser);

    if (typeof pdfParser === 'function') {
        console.log('Parser is a function!');
        try {
            // Create a dummy PDF buffer (not real PDF, might fail parse but should call function)
            const buf = Buffer.from('%PDF-1.4 ... dummy content');
            // It might throw "InvalidPDFException" which is good, means function worked
            await pdfParser(buf).catch(e => console.log('Called function, got error (expected):', e.message));
        } catch (e) {
            console.log('Calling threw:', e);
        }
    } else {
        console.error('STILL NOT A FUNCTION');
    }
}

test();

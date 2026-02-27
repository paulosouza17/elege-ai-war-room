const pdfLib = require('pdf-parse');

async function testConstruct() {
    console.log('Testing PDFParse invocation...');
    const buf = Buffer.from('%PDF-1.5\n%\n%%EOF');

    // Test 1: Call as function
    console.log('--- Attempt 1: Call PDFParse as function ---');
    if (pdfLib.PDFParse) {
        try {
            const res = await pdfLib.PDFParse(buf);
            console.log('Success calling as function!', res);
        } catch (e: any) {
            console.log('Failed calling as function:', e.message);
        }

        // Test 2: New instance
        console.log('--- Attempt 2: New PDFParse() ---');
        try {
            const parser = new pdfLib.PDFParse(buf);
            console.log('Instantiated parser:', parser);
            // Does it have a text property or promise?
            if (parser.then) console.log('It is a promise!');
            if (parser.text) console.log('It has text property:', parser.text);
        } catch (e: any) {
            console.log('Failed new instance:', e.message);
        }
    }
}

testConstruct();

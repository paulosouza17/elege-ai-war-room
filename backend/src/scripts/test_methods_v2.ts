const pdfLib = require('pdf-parse');

async function testMethodsV2() {
    console.log('Testing PDFParse methods V2...');
    if (pdfLib.PDFParse) {
        // Create a minimal valid PDF buffer effectively
        const buf = Buffer.from('%PDF-1.5\n%\n%%EOF');
        try {
            const parser = new pdfLib.PDFParse(buf);
            console.log('Instance created.');

            // Try getText
            if (parser.getText) {
                console.log('Calling parser.getText()...');
                const text = await parser.getText();
                console.log('GetText result:', text);
            } else {
                console.log('No getText method on instance.');
            }

        } catch (e: any) {
            console.log('Error:', e.message);
        }
    }
}

testMethodsV2();

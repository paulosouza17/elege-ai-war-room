const pdfLib = require('pdf-parse');

async function testMethods() {
    console.log('Testing PDFParse methods...');
    if (pdfLib.PDFParse) {
        const buf = Buffer.from('%PDF-1.5\n%\n%%EOF');
        try {
            const parser = new pdfLib.PDFParse(); // Maybe without buffer first?
            console.log('Instance created.');

            // Try load
            if (parser.load) {
                console.log('Calling parser.load(buf)...');
                const result = await parser.load(buf);
                console.log('Load result keys:', Object.keys(result || {}));
                if (result.text) console.log('Text found via load!');
            }

            // Try getText
            if (parser.getText) {
                console.log('Calling parser.getText()...');
                const text = await parser.getText();
                console.log('GetText result:', text);
            }

        } catch (e: any) {
            console.log('Error:', e.message);
        }
    }
}

testMethods();

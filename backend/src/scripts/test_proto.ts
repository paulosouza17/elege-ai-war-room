const pdfLib = require('pdf-parse');

async function testProto() {
    console.log('Testing PDFParse prototype...');
    if (pdfLib.PDFParse) {
        const buf = Buffer.from('%PDF-1.5\n%\n%%EOF');
        try {
            const parser = new pdfLib.PDFParse(buf);
            console.log('Instance keys:', Object.keys(parser));
            console.log('Prototype keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));
        } catch (e: any) {
            console.log('Error:', e.message);
        }
    }
}

testProto();

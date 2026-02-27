const pdfLib = require('pdf-parse');

async function testClass() {
    console.log('Testing PDFParse class usage...');
    if (pdfLib.PDFParse && typeof pdfLib.PDFParse === 'function') {
        try {
            const buf = Buffer.from('%PDF-1.5\n%\n%%EOF');
            // Try instantiating?
            // const parser = new pdfLib.PDFParse(buf);
            // console.log('Instantiated:', parser); 
            // But usually pdf-parse is a promise.

            // Maybe the main logic is in another file?
            const fs = require('fs');
            console.log('Main requireresolved:', require.resolve('pdf-parse'));

        } catch (e) {
            console.log('Error:', e);
        }
    }
}

testClass();

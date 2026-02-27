export { };

const pdfLib = require('pdf-parse');

async function inspectPdfLib() {
    console.log('Keys:', Object.keys(pdfLib));
    if (pdfLib.PDFParse) {
        console.log('Type of PDFParse:', typeof pdfLib.PDFParse);
        try {
            console.log('PDFParse toString:', pdfLib.PDFParse.toString().substring(0, 100));
        } catch (e) {
            console.log('Could not toString PDFParse');
        }
    } else {
        console.log('PDFParse key not found');
    }

    // Check if main export is function
    if (typeof pdfLib === 'function') console.log('Main export IS function');
    else console.log('Main export IS ' + typeof pdfLib);
}

inspectPdfLib();

// const pdf = require('pdf-parse'); // Removed to prevent crashes
import mammoth from 'mammoth';
import xlsx from 'xlsx';

export class FileExtractor {
    static async extractText(buffer: Buffer, fileType: string, originalName: string): Promise<string> {
        const mime = fileType.toLowerCase();
        const ext = originalName.split('.').pop()?.toLowerCase();

        console.log(`[FileExtractor] Extracting ${mime} (${ext}) - Size: ${buffer.length}`);

        try {
            // PDF (DISABLED LOCAL EXTRACTION)
            if (mime.includes('pdf') || ext === 'pdf' || mime === 'application/pdf') {
                // We now send PDFs directly to Gemini Multimodal. 
                // If this is reached, it's a fallback or error in logic, so return empty or throw.
                return "[PDF File] - Content sent directly to AI Model (Multimodal). Local text extraction skipped.";
            }

            // Word (DOCX)
            if (mime.includes('wordprocessingml') || ext === 'docx') {
                const result = await mammoth.extractRawText({ buffer });
                return result.value;
            }

            // Excel / CSV
            if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv') || ['xlsx', 'xls', 'csv'].includes(ext || '')) {
                const workbook = xlsx.read(buffer, { type: 'buffer' });
                let text = '';
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    text += xlsx.utils.sheet_to_txt(sheet);
                });
                return text;
            }

            // Text / JSON / Code
            if (mime.startsWith('text/') || ['txt', 'md', 'json', 'js', 'ts', 'py', 'sql'].includes(ext || '')) {
                return buffer.toString('utf-8');
            }

            // Default fallback
            return `[FileExtractor] File type ${fileType} not supported for deep extraction. Original Name: ${originalName}`;

        } catch (error: any) {
            console.error('[FileExtractor] Error:', error);
            throw new Error(`Failed to extract text: ${error.message}`);
        }
    }
}

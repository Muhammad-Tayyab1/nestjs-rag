import { parsePdf } from './pdf.parser';
import { parseTxt } from './txt.parser';
import { parseMd } from './md.parser';
import { parseDocx } from './docx.parser';

jest.mock('pdf-parse', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({ text: 'PDF content here' }),
}));
jest.mock('mammoth', () => ({
  __esModule: true,
  default: {
    extractRawText: jest.fn().mockResolvedValue({ value: 'DOCX content here' }),
  },
}));

describe('Document Parsers', () => {
  it('parseTxt returns buffer as UTF-8 string', async () => {
    const buf = Buffer.from('hello text file');
    const result = await parseTxt(buf);
    expect(result).toBe('hello text file');
  });

  it('parseMd returns buffer as UTF-8 string', async () => {
    const buf = Buffer.from('# Heading\nsome content');
    const result = await parseMd(buf);
    expect(result).toBe('# Heading\nsome content');
  });

  it('parsePdf extracts text via pdf-parse', async () => {
    const buf = Buffer.from('fake-pdf-bytes');
    const result = await parsePdf(buf);
    expect(result).toBe('PDF content here');
  });

  it('parseDocx extracts text via mammoth', async () => {
    const buf = Buffer.from('fake-docx-bytes');
    const result = await parseDocx(buf);
    expect(result).toBe('DOCX content here');
  });
});

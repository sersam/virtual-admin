interface MeetingMinutesPdfInput {
  readonly body: string;
  readonly title: string;
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const HORIZONTAL_MARGIN = 50;
const TOP_MARGIN = 792;
const LINE_HEIGHT = 16;
const LINES_PER_PAGE = 45;
const MAX_LINE_LENGTH = 82;
const PDF_FILENAME = 'acta-reunion.pdf';

export function createMeetingMinutesPdfBlob(input: MeetingMinutesPdfInput): Blob {
  const content = normalizePdfContent(input);
  const pages = chunkLines(wrapContent(content), LINES_PER_PAGE);
  const objects = buildPdfObjects(pages.length > 0 ? pages : [['']]);
  const pdf = serializePdf(objects);

  return new Blob([pdf], { type: 'application/pdf' });
}

export function downloadMeetingMinutesPdf(input: MeetingMinutesPdfInput): void {
  const url = URL.createObjectURL(createMeetingMinutesPdfBlob(input));
  const link = document.createElement('a');

  link.href = url;
  link.download = PDF_FILENAME;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function normalizePdfContent(input: MeetingMinutesPdfInput): string {
  const body = input.body.trim();
  if (body.toLocaleLowerCase('es').startsWith(input.title.toLocaleLowerCase('es'))) {
    return body;
  }

  return [input.title, '', body].join('\n');
}

function wrapContent(content: string): string[] {
  return content.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n').flatMap(wrapLine);
}

function wrapLine(line: string): string[] {
  if (line.trim().length === 0) return [''];

  const words = line.trim().split(/\s+/u);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (word.length > MAX_LINE_LENGTH) {
      if (currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = '';
      }
      lines.push(...splitLongWord(word));
      continue;
    }

    const nextLine = currentLine.length > 0 ? `${currentLine} ${word}` : word;
    if (nextLine.length > MAX_LINE_LENGTH) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine.length > 0) lines.push(currentLine);
  return lines;
}

function splitLongWord(word: string): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < word.length; index += MAX_LINE_LENGTH) {
    chunks.push(word.slice(index, index + MAX_LINE_LENGTH));
  }

  return chunks;
}

function chunkLines(lines: string[], chunkSize: number): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < lines.length; index += chunkSize) {
    chunks.push(lines.slice(index, index + chunkSize));
  }

  return chunks;
}

function buildPdfObjects(pages: string[][]): string[] {
  const kids = pages.map((_, index) => `${4 + index * 2} 0 R`).join(' ');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];

  for (const [index, pageLines] of pages.entries()) {
    const pageObjectId = 4 + index * 2;
    const contentObjectId = pageObjectId + 1;
    const stream = buildPageContentStream(pageLines);

    objects.push(
      [
        '<< /Type /Page',
        '/Parent 2 0 R',
        `/MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}]`,
        '/Resources << /Font << /F1 3 0 R >> >>',
        `/Contents ${contentObjectId} 0 R`,
        '>>',
      ].join(' '),
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }

  return objects;
}

function buildPageContentStream(lines: string[]): string {
  return [
    'BT',
    '/F1 12 Tf',
    `${HORIZONTAL_MARGIN} ${TOP_MARGIN} Td`,
    `${LINE_HEIGHT} TL`,
    ...lines.map((line) => `(${escapePdfLiteral(line)}) Tj\nT*`),
    'ET',
  ].join('\n');
}

function escapePdfLiteral(text: string): string {
  let escaped = '';

  for (const byte of encodeWinAnsi(text)) {
    if (byte === 40 || byte === 41 || byte === 92) {
      escaped += '\\';
    }
    escaped += String.fromCodePoint(byte);
  }

  return escaped;
}

function encodeWinAnsi(text: string): number[] {
  const bytes: number[] = [];

  for (let index = 0; index < text.length; ) {
    const codePoint = text.codePointAt(index) ?? 0;
    bytes.push(toWinAnsiByte(codePoint));
    index += codePoint > 0xffff ? 2 : 1;
  }

  return bytes;
}

function toWinAnsiByte(codePoint: number): number {
  if (codePoint <= 0x7f || (codePoint >= 0xa0 && codePoint <= 0xff)) return codePoint;

  const mappedByte = winAnsiSpecialBytes.get(codePoint);
  return mappedByte ?? 63;
}

const winAnsiSpecialBytes = new Map<number, number>([
  [0x20ac, 0x80],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
]);

function serializePdf(objects: string[]): Uint8Array {
  const offsets = [0];
  let binary = '%PDF-1.4\n';

  for (const [index, object] of objects.entries()) {
    offsets.push(binary.length);
    binary += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  const xrefOffset = binary.length;
  binary += `xref\n0 ${objects.length + 1}\n`;
  binary += '0000000000 65535 f \n';
  binary += offsets
    .slice(1)
    .map((offset) => `${offset.toString().padStart(10, '0')} 00000 n \n`)
    .join('');
  binary += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  binary += `startxref\n${xrefOffset}\n%%EOF\n`;

  return binaryToBytes(binary);
}

function binaryToBytes(binary: string): Uint8Array {
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.codePointAt(index) ?? 0;
  }

  return bytes;
}

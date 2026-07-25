import { describe, expect, it } from 'vitest';
import { createCommunityNoticePdfBlob } from './communityNoticePdf';

describe('createCommunityNoticePdfBlob', () => {
  it('crea un PDF descargable con el asunto y cuerpo editados', async () => {
    const blob = createCommunityNoticePdfBlob({
      body: 'Estimados residentes:\n\nSe revisa el ascensor manana.',
      subject: 'Revision del ascensor',
    });

    expect(blob.type).toBe('application/pdf');
    const content = await readBlobAsText(blob);
    expect(content.startsWith('%PDF-1.4')).toBe(true);
    expect(content).toContain('Revision del ascensor');
    expect(content).toContain('Se revisa el ascensor');
  });
});

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsText(blob);
  });
}

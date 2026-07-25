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

  it('crea varias paginas para contenidos largos', async () => {
    const blob = createCommunityNoticePdfBlob({
      body: Array.from({ length: 60 }, (_, index) => `Linea ${index + 1}`).join('\n'),
      subject: 'Aviso extenso',
    });

    const content = await readBlobAsText(blob);
    expect(content.startsWith('%PDF-1.4')).toBe(true);
    expect(content).toContain('/Count 2');
    expect(content).toContain('Linea 60');
  });

  it('mantiene un PDF valido con asunto y cuerpo vacios', async () => {
    const blob = createCommunityNoticePdfBlob({ body: '', subject: '' });

    const content = await readBlobAsText(blob);
    expect(blob.type).toBe('application/pdf');
    expect(content.startsWith('%PDF-1.4')).toBe(true);
    expect(content).toContain('stream');
  });

  it('escapa caracteres especiales en asunto y cuerpo', async () => {
    const blob = createCommunityNoticePdfBlob({
      body: 'Usar puerta (norte) \\ sur.',
      subject: 'Aviso (Portal \\ A)',
    });

    const content = await readBlobAsText(blob);
    expect(content).toContain('Aviso \\(Portal \\\\ A\\)');
    expect(content).toContain('Usar puerta \\(norte\\) \\\\ sur.');
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

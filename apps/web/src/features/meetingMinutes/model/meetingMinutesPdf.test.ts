import { describe, expect, it } from 'vitest';
import { createMeetingMinutesPdfBlob } from './meetingMinutesPdf';

describe('createMeetingMinutesPdfBlob', () => {
  it('crea un PDF descargable con el contenido editado del acta', async () => {
    const blob = createMeetingMinutesPdfBlob({
      body: 'Acta revisada por secretaría.\n\nAcuerdos:\n- Aprobar presupuesto.',
      title: 'Acta de reunión',
    });

    expect(blob.type).toBe('application/pdf');
    const content = await readBlobAsText(blob);
    expect(content.startsWith('%PDF-1.4')).toBe(true);
    expect(content).toContain('Acta revisada por');
    expect(content).toContain('Aprobar presupuesto');
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

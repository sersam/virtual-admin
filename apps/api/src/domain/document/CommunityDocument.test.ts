import { describe, expect, it } from 'vitest';
import { buildDocumentExcerpt, type CommunityDocument } from './CommunityDocument.js';

const document: CommunityDocument = {
  id: 'doc',
  title: 'Documento',
  type: 'normas',
  section: 'Sección',
  content: 'Texto   con\nespacios   repetidos y contenido suficientemente largo.',
  documentUrl: '/documents/documento.pdf',
};

describe('CommunityDocument', () => {
  it('normaliza espacios al construir extractos', () => {
    expect(buildDocumentExcerpt(document)).toBe(
      'Texto con espacios repetidos y contenido suficientemente largo.',
    );
  });

  it('recorta extractos largos con elipsis', () => {
    expect(buildDocumentExcerpt(document, 18)).toBe('Texto con espacio…');
  });

  it('limita extractos con longitudes no positivas', () => {
    expect(buildDocumentExcerpt(document, 0)).toBe('…');
    expect(buildDocumentExcerpt(document, -10)).toBe('…');
  });

  it('permite extractos de longitud uno como elipsis', () => {
    expect(buildDocumentExcerpt(document, 1)).toBe('…');
  });
});

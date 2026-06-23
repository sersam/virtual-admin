import { describe, expect, it } from 'vitest';
import { residencialSierraNevadaDocuments } from './residencialSierraNevadaDocuments.js';
import { LexicalDocumentRetriever } from './LexicalDocumentRetriever.js';

describe('LexicalDocumentRetriever', () => {
  it('recupera normas de piscina para preguntas sobre horarios', async () => {
    const retriever = new LexicalDocumentRetriever(residencialSierraNevadaDocuments);

    const [first] = await retriever.retrieve('¿Cuál es el horario de la piscina?', 3);

    expect(first).toMatchObject({ id: 'normas-piscina' });
  });

  it('recupera actas relevantes para consultas de ascensor', async () => {
    const retriever = new LexicalDocumentRetriever(residencialSierraNevadaDocuments);

    const [first] = await retriever.retrieve('¿Qué se aprobó del ascensor del portal B?', 2);

    expect(first).toMatchObject({ id: 'acta-ascensor' });
  });

  it('no devuelve fuentes cuando la pregunta no coincide con el corpus', async () => {
    const retriever = new LexicalDocumentRetriever(residencialSierraNevadaDocuments);

    await expect(retriever.retrieve('¿Hay pista de pádel cubierta?', 3)).resolves.toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { isMeetingMinutesRequest } from './MeetingMinutesIntent.js';

describe('isMeetingMinutesRequest', () => {
  it.each(['Necesito preparar un acta formal.', 'Genera actas de la junta ordinaria.'])(
    'detecta peticiones explícitas de actas: %s',
    (message) => {
      expect(isMeetingMinutesRequest(message)).toBe(true);
    },
  );

  it.each(['Consulta el acuerdo del ascensor.', 'Resume estas notas.'])(
    'no detecta actas con una señal genérica aislada: %s',
    (message) => {
      expect(isMeetingMinutesRequest(message)).toBe(false);
    },
  );

  it('detecta actas cuando combina señales de acuerdos y tareas', () => {
    expect(isMeetingMinutesRequest('Acuerdo: aprobar presupuesto. Tarea: revisar contrato.')).toBe(
      true,
    );
  });
});

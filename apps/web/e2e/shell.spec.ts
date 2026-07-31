import { expect, test } from '@playwright/test';

test('muestra la portada institucional y navega entre herramientas', async ({ page }, testInfo) => {
  await page.route('**/api/observability', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: observabilityResponse,
      status: 200,
    });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Una administración más clara',
  );
  await expect(
    page.getByRole('main').getByText('Residencial Sierra Nevada', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Demo sin registro y sin estado compartido' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Límites y métricas técnicas IA' })).toBeVisible();
  await expect(page.getByText('20 acciones por sesión')).toBeVisible();

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Abrir menú' }).click();
  }

  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Documentos' })
    .click();
  await expect(page).toHaveURL(/\/documentos$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Pregunta a los documentos de la comunidad' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Documentos disponibles' })).toBeVisible();
});

test('muestra biblioteca de PDFs sin consultar', async ({ page }) => {
  await page.goto('/documentos');

  await expect(page.getByRole('heading', { name: 'Documentos disponibles' })).toBeVisible();
  const directPdfLink = page
    .getByRole('article')
    .filter({ hasText: 'Contrato de mantenimiento de jardines' })
    .getByRole('link', { name: 'Abrir PDF' });

  await expect(directPdfLink).toHaveAttribute('href', /\/documents\/contrato-jardines\.pdf$/);
  await expect(directPdfLink).toHaveAttribute('target', '_blank');
});

test('consulta documentos y muestra fuentes recuperadas', async ({ page }, testInfo) => {
  await page.goto('/documentos');

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Consultar documentación' }).scrollIntoViewIfNeeded();
  }

  await page.getByRole('button', { name: 'Consultar documentación' }).click();
  const answerRegion = page.getByLabel('Fuentes recuperadas');
  await expect(
    answerRegion.getByRole('heading', { name: 'Normas de uso de zonas comunes' }),
  ).toBeVisible();
  await expect(
    answerRegion.getByRole('article').getByText(/piscina comunitaria abre de 10:00 a 21:00/i),
  ).toBeVisible();

  const pdfLink = answerRegion.getByRole('link', { name: 'Abrir PDF completo' }).first();
  await expect(pdfLink).toHaveAttribute('href', /\/documents\/normas-zonas-comunes\.pdf$/);
  await expect(pdfLink).toHaveAttribute('target', '_blank');

  const pdfPagePromise = page.waitForEvent('popup');
  await pdfLink.click();
  const pdfPage = await pdfPagePromise;
  expect(pdfPage).toBeTruthy();
  await pdfPage.close();
});

test('chat coordinador permite probar todas las áreas del MVP', async ({ page }, testInfo) => {
  await page.route('**/api/chat/messages', (route) => route.abort());
  await page.goto('/chat');

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Actas' }).scrollIntoViewIfNeeded();
  }

  await expect(page.getByRole('button', { name: 'Documentos' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Comunicados' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Actas' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Incidencias' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Juntas' })).toBeVisible();

  await page.getByRole('button', { name: 'Actas' }).click();
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();

  const answerRegion = page.getByLabel('Respuesta del coordinador');
  await expect(answerRegion.getByText('Agente de actas', { exact: true })).toBeVisible();
  await expect(answerRegion.getByText(/Acta de reunión/)).toBeVisible();
  await expect(answerRegion.getByText(/Acuerdos:/)).toBeVisible();
  await expect(answerRegion.getByText('Modo demo local')).toBeVisible();
  await expect(answerRegion.getByText('Enrutado por demo determinista')).toBeVisible();
});

test('redacta comunicados para vecinos', async ({ page }, testInfo) => {
  await page.route('**/api/communications/draft', (route) => route.abort());
  await page.goto('/comunicados');

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Redactar comunicado' }).scrollIntoViewIfNeeded();
  }

  await expect(
    page.getByRole('heading', { level: 1, name: 'Redacta comunicados para vecinos' }),
  ).toBeVisible();

  await page.getByLabel('Asunto').fill('Corte de agua');
  await page.getByLabel('Tipo').selectOption('recordatorio');
  await page.getByLabel('Audiencia').selectOption('residentes');
  await page.getByLabel('Tono').selectOption('cercano');
  await page.getByRole('button', { name: 'Redactar comunicado' }).click();

  const draftRegion = page.getByLabel('Comunicado generado');
  await expect(draftRegion.getByRole('heading', { name: 'Corte de agua' })).toBeVisible();
  await expect(draftRegion.getByLabel('Asunto editable')).toHaveValue('Corte de agua');
  await expect(draftRegion.getByLabel('Cuerpo editable del comunicado')).toHaveValue(
    /Estimados residentes:/,
  );
  await expect(draftRegion.getByText('Demo determinista')).toBeVisible();
});

test('muestra el motivo de fallback determinista en comunicados', async ({ page }, testInfo) => {
  await page.route('**/api/communications/draft', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        draft: {
          subject: 'Corte de agua',
          body: 'Estimados vecinos:\n\nComunicado determinista por fallback.',
        },
        fallbackReason: 'provider-error',
        mode: 'deterministic-demo',
      }),
    });
  });
  await page.goto('/comunicados');

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Redactar comunicado' }).scrollIntoViewIfNeeded();
  }

  await page.getByLabel('Asunto').fill('Corte de agua');
  await page.getByRole('button', { name: 'Redactar comunicado' }).click();

  const draftRegion = page.getByLabel('Comunicado generado');
  await expect(draftRegion.getByText('Demo determinista')).toBeVisible();
  await expect(draftRegion.getByText(/OpenAI no respondió correctamente/i)).toBeVisible();
});

test('muestra actas OpenAI simuladas con acuerdos detectados', async ({ page }, testInfo) => {
  await page.route('**/api/meeting-minutes/draft', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        draft: {
          title: 'Acta de reunión',
          body: 'Acta de reunión\n\nAcuerdos:\n- Aprobar presupuesto anual.',
          agreements: ['Aprobar presupuesto anual.'],
          tasks: [{ description: 'Revisar contrato', assignee: 'Ana' }],
        },
        mode: 'openai',
      }),
    });
  });
  await page.goto('/actas');

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Generar acta' }).scrollIntoViewIfNeeded();
  }

  await page.getByRole('button', { name: 'Generar acta' }).click();

  const draftRegion = page.getByLabel('Acta generada');
  await expect(draftRegion.getByText('OpenAI')).toBeVisible();
  await expect(draftRegion.getByText('Acuerdos detectados')).toBeVisible();
  await expect(
    draftRegion.getByRole('listitem').filter({ hasText: 'Aprobar presupuesto anual.' }),
  ).toBeVisible();
  await expect(draftRegion.getByText('Tareas detectadas')).toBeVisible();
  await expect(draftRegion.getByText('Revisar contrato')).toBeVisible();
});

test('continua desde chat a comunicados, copia y descarga PDF', async ({
  context,
  page,
}, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.route('**/api/chat/messages', (route) => route.abort());
  await page.route('**/api/communications/draft', (route) => route.abort());
  await page.goto('/chat');

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Comunicados' }).scrollIntoViewIfNeeded();
  }

  await page.getByRole('button', { name: 'Comunicados' }).click();
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();

  const answerRegion = page.getByLabel('Respuesta del coordinador');
  await expect(answerRegion.getByText('Agente de comunicados')).toBeVisible();
  await answerRegion.getByRole('button', { name: 'Continuar en Comunicados' }).click();

  await expect(page).toHaveURL(/\/comunicados$/);
  await expect(page.getByLabel('Asunto')).toHaveValue('Corte de agua del jueves');

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Redactar comunicado' }).scrollIntoViewIfNeeded();
  }

  await page.getByRole('button', { name: 'Redactar comunicado' }).click();
  const draftRegion = page.getByLabel('Comunicado generado');
  await draftRegion.getByLabel('Asunto editable').fill('Corte de agua actualizado');
  await draftRegion
    .getByLabel('Cuerpo editable del comunicado')
    .fill('Contenido editado para reutilizar fuera de la aplicación.');

  await draftRegion.getByRole('button', { name: 'Copiar comunicado' }).click();
  await expect(draftRegion.getByText('Comunicado copiado.')).toBeVisible();
  await expect(page.evaluate(() => navigator.clipboard.readText())).resolves.toBe(
    'Asunto: Corte de agua actualizado\n\nContenido editado para reutilizar fuera de la aplicación.',
  );

  const downloadPromise = page.waitForEvent('download');
  await draftRegion.getByRole('button', { name: 'Descargar PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('comunicado.pdf');
});

test('genera actas desde notas de reunión', async ({ page }, testInfo) => {
  await page.route('**/api/meeting-minutes/draft', (route) => route.abort());
  await page.goto('/actas');

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Generar acta' }).scrollIntoViewIfNeeded();
  }

  await expect(
    page.getByRole('heading', { level: 1, name: 'Convierte notas en actas' }),
  ).toBeVisible();

  await page
    .getByLabel('Notas de la reunión')
    .fill(
      [
        'Junta ordinaria del 12 de junio.',
        'Acuerdo: aprobar presupuesto.',
        'Tarea: Revisar contrato; Responsable: Ana',
      ].join('\n'),
    );
  await page.getByRole('button', { name: 'Generar acta' }).click();

  const draftRegion = page.getByLabel('Acta generada');
  await expect(draftRegion.getByRole('heading', { name: 'Acta de reunión' })).toBeVisible();
  const editableDraft = draftRegion.getByLabel('Borrador editable del acta');
  await expect(editableDraft).toHaveValue(/Acuerdos:/);
  await editableDraft.fill('Acta revisada por secretaría.');
  await expect(editableDraft).toHaveValue('Acta revisada por secretaría.');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('acta-reunion.pdf');
  await expect(
    draftRegion.getByRole('listitem').filter({ hasText: 'Revisar contrato' }),
  ).toBeVisible();
  await expect(draftRegion.getByText('Demo determinista')).toBeVisible();
});

test('prepara juntas con entradas trazables y borrador editable', async ({ page }, testInfo) => {
  await page.route('**/api/meetings', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: {
        meetings: [
          {
            id: 'meeting-ordinary-2026-09-18',
            kind: 'ordinaria',
            title: 'Junta ordinaria',
            scheduledAt: '2026-09-18T17:00:00.000Z',
          },
          {
            id: 'meeting-extraordinary-2026-10-15',
            kind: 'extraordinaria',
            title: 'Junta extraordinaria',
            scheduledAt: '2026-10-15T17:00:00.000Z',
          },
        ],
      },
      status: 200,
    });
  });
  await page.route('**/api/meeting-agendas/draft', async (route) => {
    const payload = route.request().postDataJSON() as { readonly meetingId: string };
    expect(payload.meetingId).toBe('meeting-extraordinary-2026-10-15');

    await route.fulfill({
      contentType: 'application/json',
      json: {
        draft: {
          title: 'Orden del día · Junta extraordinaria · 15 de octubre de 2026',
          body: [
            'Orden del día · Junta extraordinaria · 15 de octubre de 2026',
            '',
            '1. Revisión prioritaria de la fuga de agua urgente en el garaje.',
            '2. Seguimiento del contrato de limpieza.',
            '3. Valoración de la instalación de aparcabicis.',
          ].join('\n'),
          items: [
            {
              description: 'Hay una fuga de agua urgente en el garaje.',
              priority: 'urgente',
              sourceType: 'incident',
              sourceId: 'inc-1',
            },
            {
              description: 'Revisar contrato de limpieza',
              priority: 'alta',
              sourceType: 'pending-agreement',
              sourceId: 'pending-1',
              assignee: 'Ana',
              dueDate: '30 de junio',
            },
            {
              description: 'Instalar aparcabicis en el patio interior.',
              sourceType: 'proposal',
              sourceId: 'proposal-1',
            },
          ],
        },
        meeting: {
          id: 'meeting-extraordinary-2026-10-15',
          kind: 'extraordinaria',
          title: 'Junta extraordinaria',
          scheduledAt: '2026-10-15T17:00:00.000Z',
        },
        mode: 'openai',
      },
      status: 200,
    });
  });
  await page.goto('/juntas');

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Preparar orden del día' }).scrollIntoViewIfNeeded();
  }

  await expect(
    page.getByRole('heading', { level: 1, name: 'Prepara el orden del día' }),
  ).toBeVisible();
  await page.getByLabel('Junta demo').selectOption('meeting-extraordinary-2026-10-15');
  await page.getByRole('button', { name: 'Preparar orden del día' }).click();

  const draftRegion = page.getByLabel('Orden del día generado');
  const editableDraft = draftRegion.getByLabel('Borrador editable del orden del día');
  await expect(draftRegion.getByRole('heading', { name: /Junta extraordinaria/ })).toBeVisible();
  await expect(editableDraft).toHaveValue(/fuga de agua urgente/);
  await editableDraft.fill('Orden del día revisado por administración.');
  await expect(editableDraft).toHaveValue('Orden del día revisado por administración.');
  await expect(draftRegion.getByText('OpenAI · GPT-5 nano')).toBeVisible();
  await expect(draftRegion.getByText('Entradas utilizadas')).toBeVisible();
  await expect(draftRegion.getByText('Incidencia', { exact: true })).toBeVisible();
  await expect(draftRegion.getByText('Acuerdo pendiente', { exact: true })).toBeVisible();
  await expect(draftRegion.getByText('Revisar contrato de limpieza')).toBeVisible();
  await expect(draftRegion.getByText('Propuesta vecinal', { exact: true })).toBeVisible();
  await expect(draftRegion.getByText('Instalar aparcabicis en el patio interior.')).toBeVisible();
});

test('registra propuestas vecinales y las incluye como fuente trazable de junta', async ({
  page,
}, testInfo) => {
  const proposals: Array<{ id: string; description: string; createdAt: string }> = [];

  await page.route('**/api/meetings', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: {
        meetings: [
          {
            id: 'meeting-ordinary-2026-09-18',
            kind: 'ordinaria',
            title: 'Junta ordinaria',
            scheduledAt: '2026-09-18T17:00:00.000Z',
          },
        ],
      },
      status: 200,
    });
  });
  await page.route('**/api/proposals', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        contentType: 'application/json',
        json: { proposals },
        status: 200,
      });
      return;
    }

    const payload = route.request().postDataJSON() as { readonly description: string };
    const proposal = {
      id: 'proposal-1',
      description: payload.description,
      createdAt: '2026-07-26T10:00:00.000Z',
    };
    proposals.unshift(proposal);
    await route.fulfill({
      contentType: 'application/json',
      json: { proposal },
      status: 201,
    });
  });
  await page.route('**/api/meeting-agendas/draft', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: {
        draft: {
          title: 'Orden del día · Junta ordinaria · 18 de septiembre de 2026',
          body:
            proposals.length > 0
              ? ['Orden del día', '', `1. ${proposals[0]!.description}`].join('\n')
              : 'No hay asuntos pendientes para incluir en el orden del día.',
          items: proposals.map((proposal) => ({
            description: proposal.description,
            sourceType: 'proposal',
            sourceId: proposal.id,
          })),
        },
        meeting: {
          id: 'meeting-ordinary-2026-09-18',
          kind: 'ordinaria',
          title: 'Junta ordinaria',
          scheduledAt: '2026-09-18T17:00:00.000Z',
        },
        mode: 'deterministic-demo',
      },
      status: 200,
    });
  });
  await page.goto('/juntas');

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Registrar propuesta' }).scrollIntoViewIfNeeded();
  }

  await expect(page.getByText('Aún no hay propuestas registradas en esta sesión.')).toBeVisible();
  await page.getByRole('button', { name: 'Preparar orden del día' }).click();
  await expect(page.getByLabel('Borrador editable del orden del día')).toBeVisible();

  await page
    .getByLabel('Descripción de la propuesta')
    .fill('Instalar aparcabicis en el patio interior.');
  await page.getByRole('button', { name: 'Registrar propuesta' }).click();

  await expect(page.getByRole('status')).toHaveText('Propuesta registrada.');
  await expect(page.getByLabel('Descripción de la propuesta')).toHaveValue('');
  await expect(page.getByText('Instalar aparcabicis en el patio interior.')).toBeVisible();
  await expect(page.getByLabel('Borrador editable del orden del día')).toBeHidden();

  await page.getByRole('button', { name: 'Preparar orden del día' }).click();

  const draftRegion = page.getByLabel('Orden del día generado');
  await expect(draftRegion.getByLabel('Borrador editable del orden del día')).toHaveValue(
    /Instalar aparcabicis en el patio interior\./,
  );
  await expect(draftRegion.getByText('Propuesta vecinal')).toBeVisible();
  await expect(draftRegion.getByText('proposal-1')).toBeVisible();
});

test('registra incidencias y filtra por tipo', async ({ context, page }, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const suggestedNoticeFor = (description: string) =>
    [
      'Estimados vecinos:',
      '',
      `Se ha registrado la siguiente incidencia: ${description}`,
      '',
      'La administración comunicará cualquier novedad relevante.',
    ].join('\n');
  const incidents: Array<{
    id: string;
    description: string;
    type: 'agua' | 'ascensor';
    priority: 'alta' | 'urgente';
    suggestedResponsible: string;
    suggestedNotice: string;
    createdAt: string;
    status: 'pendiente' | 'resuelta';
    resolvedAt: string | null;
  }> = [];

  await page.route(/\/api\/incidents(?:\/[^/?]+\/resolve)?(?:\?.*)?$/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'GET') {
      const type = url.searchParams.get('type');
      await route.fulfill({
        contentType: 'application/json',
        json: {
          incidents: type ? incidents.filter((incident) => incident.type === type) : incidents,
        },
        status: 200,
      });
      return;
    }

    if (request.method() === 'PATCH') {
      const incidentId = url.pathname.split('/').at(-2);
      const index = incidents.findIndex((incident) => incident.id === incidentId);
      const incident = {
        ...incidents[index]!,
        status: 'resuelta' as const,
        resolvedAt: '2026-06-27T12:30:00.000Z',
      };
      incidents[index] = incident;
      await route.fulfill({
        contentType: 'application/json',
        json: { incident },
        status: 200,
      });
      return;
    }

    const payload = request.postDataJSON() as { readonly description: string };
    const isLiftIncident = payload.description.toLowerCase().includes('ascensor');
    const incident = {
      id: `inc-000${incidents.length + 1}`,
      description: payload.description,
      type: isLiftIncident ? ('ascensor' as const) : ('agua' as const),
      priority: isLiftIncident ? ('alta' as const) : ('urgente' as const),
      suggestedResponsible: isLiftIncident ? 'Mantenimiento de ascensores' : 'Fontanería',
      suggestedNotice: suggestedNoticeFor(payload.description),
      createdAt: '2026-06-27T10:00:00.000Z',
      status: 'pendiente' as const,
      resolvedAt: null,
    };
    incidents.push(incident);

    await route.fulfill({
      contentType: 'application/json',
      json: { incident, mode: 'deterministic-demo' },
      status: 201,
    });
  });

  await page.goto('/incidencias');

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Registrar incidencia' }).scrollIntoViewIfNeeded();
  }

  await expect(
    page.getByRole('heading', { level: 1, name: 'Registra y clasifica incidencias' }),
  ).toBeVisible();
  await expect(page.getByText('Sin incidencias registradas')).toBeVisible();

  await page
    .getByLabel('Descripción de la incidencia')
    .fill('Hay una fuga de agua urgente en el garaje.');
  await page.getByRole('button', { name: 'Registrar incidencia' }).click();
  const waterIncident = page.getByRole('article', { name: /fuga de agua urgente/i });
  await expect(waterIncident).toBeVisible();
  await expect(waterIncident.getByText('Agua', { exact: true })).toBeVisible();
  await expect(waterIncident.getByText('Urgente', { exact: true })).toBeVisible();
  await expect(waterIncident.getByText('Fontanería')).toBeVisible();
  await expect(waterIncident.getByRole('heading', { name: 'Comunicado sugerido' })).toBeVisible();
  await expect(
    waterIncident.getByText(suggestedNoticeFor('Hay una fuga de agua urgente en el garaje.')),
  ).toBeVisible();
  await expect(waterIncident.getByText('Pendiente', { exact: true })).toBeVisible();
  await expect(page.getByText('Demo determinista')).toBeVisible();
  await waterIncident.getByRole('button', { name: 'Copiar comunicado sugerido' }).click();
  await expect(waterIncident.getByText('Comunicado copiado.')).toBeVisible();
  await expect(page.evaluate(() => navigator.clipboard.readText())).resolves.toBe(
    suggestedNoticeFor('Hay una fuga de agua urgente en el garaje.'),
  );
  await waterIncident.getByRole('button', { name: 'Marcar como resuelta' }).click();
  await expect(waterIncident.getByText('Resuelta', { exact: true })).toBeVisible();
  await expect(waterIncident.getByText('Resolución', { exact: true })).toBeVisible();

  await page
    .getByLabel('Descripción de la incidencia')
    .fill('El ascensor no funciona desde esta mañana.');
  await page.getByRole('button', { name: 'Registrar incidencia' }).click();
  const liftIncident = page.getByRole('article', { name: /ascensor no funciona/i });
  await expect(liftIncident).toBeVisible();

  await page.getByLabel('Filtrar por tipo').selectOption('ascensor');

  await expect(liftIncident).toBeVisible();
  await expect(waterIncident).toBeHidden();
});

test('adapta la navegación al viewport', async ({ page }, testInfo) => {
  await page.goto('/');

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar menú' }).click();
    await expect(page.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    return;
  }

  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeHidden();
});

const observabilitySummary = {
  averageLatencyMs: 90,
  cachedInputTokens: 0,
  estimatedCostUsd: 0.001,
  executions: 1,
  failures: 0,
  fallbacks: 0,
  inputTokens: 20,
  outputTokens: 10,
  successes: 1,
  totalTokens: 30,
} as const;

const observabilityResponse = {
  byModel: [{ ...observabilitySummary, model: 'gpt-5-mini', provider: 'openai' }],
  byOperation: [{ ...observabilitySummary, operation: 'document-answer' }],
  generatedAt: '2026-07-31T11:00:00.000Z',
  limits: {
    aiActionsPerIpPerDay: 100,
    aiActionsPerSessionPerDay: 20,
  },
  period: {
    day: '2026-07-31',
    endsAt: '2026-08-01T00:00:00.000Z',
    startsAt: '2026-07-31T00:00:00.000Z',
    timezone: 'UTC',
  },
  summary: observabilitySummary,
};

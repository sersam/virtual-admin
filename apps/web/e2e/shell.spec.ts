import { expect, test } from '@playwright/test';

test('muestra la portada institucional y navega entre herramientas', async ({ page }, testInfo) => {
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

  const pdfLink = answerRegion.getByRole('link', { name: 'Abrir PDF completo' });
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

  await page
    .getByLabel('Necesidad del comunicado')
    .fill('Redacta un comunicado sobre el corte de agua.');
  await page.getByRole('button', { name: 'Redactar comunicado' }).click();

  const draftRegion = page.getByLabel('Comunicado generado');
  await expect(draftRegion.getByRole('heading', { name: 'Corte de agua' })).toBeVisible();
  await expect(draftRegion.getByText(/Estimados vecinos:/)).toBeVisible();
  await expect(draftRegion.getByText('Demo determinista')).toBeVisible();
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
  await page.route('**/api/meeting-agendas/draft', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: {
        draft: {
          title: 'Orden del día',
          body: [
            'Orden del día',
            '',
            '1. [Urgente] Hay una fuga de agua urgente en el garaje.',
            '   Origen: incidencia inc-1.',
            '2. [Alta] Revisar contrato de limpieza.',
            '   Origen: acuerdo pendiente pending-1. Responsable: Ana. Fecha: 30 de junio.',
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
          ],
        },
        mode: 'deterministic-demo',
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
  await page.getByRole('button', { name: 'Preparar orden del día' }).click();

  const draftRegion = page.getByLabel('Orden del día generado');
  const editableDraft = draftRegion.getByLabel('Borrador editable del orden del día');
  await expect(editableDraft).toHaveValue(/fuga de agua urgente/);
  await editableDraft.fill('Orden del día revisado por administración.');
  await expect(editableDraft).toHaveValue('Orden del día revisado por administración.');
  await expect(draftRegion.getByText('Entradas utilizadas')).toBeVisible();
  await expect(draftRegion.getByText('Incidencia', { exact: true })).toBeVisible();
  await expect(draftRegion.getByText('Acuerdo pendiente', { exact: true })).toBeVisible();
  await expect(draftRegion.getByText('Revisar contrato de limpieza')).toBeVisible();
});

test('registra incidencias y filtra por tipo', async ({ page }, testInfo) => {
  const incidents: Array<{
    id: string;
    description: string;
    type: 'agua' | 'ascensor';
    priority: 'alta' | 'urgente';
    suggestedResponsible: string;
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
  await expect(waterIncident.getByText('Pendiente', { exact: true })).toBeVisible();
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

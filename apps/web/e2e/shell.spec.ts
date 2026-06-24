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
    await page.getByRole('button', { name: 'Incidencias' }).scrollIntoViewIfNeeded();
  }

  await expect(page.getByRole('button', { name: 'Documentos' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Comunicados' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Actas' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Incidencias' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Juntas' })).toBeVisible();

  await page.getByRole('button', { name: 'Incidencias' }).click();
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();

  const answerRegion = page.getByLabel('Respuesta del coordinador');
  await expect(answerRegion.getByText('Agente de incidencias', { exact: true })).toBeVisible();
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

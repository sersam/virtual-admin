import { expect, test } from '@playwright/test';

test('muestra la portada institucional y navega entre herramientas', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Una administración más clara',
  );
  await expect(
    page.getByRole('main').getByText('Residencial Sierra Nevada', { exact: false }),
  ).toBeVisible();

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Abrir menú' }).click();
  }

  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Documentos' })
    .click();
  await expect(page).toHaveURL(/\/documentos$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Documentos' })).toBeVisible();
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

import { test, expect } from '@playwright/test';
import baseline from '../../../docs/redesign/parity.json' with { type: 'json' };

const entries = baseline.requirements;

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('wheel customizes, weights and restores the saved setup', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await expect(
    page.getByRole('heading', { name: 'Give it a spin.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Option 1', exact: true }),
  ).toHaveValue('Yes');
  await expect(
    page.getByRole('textbox', { name: 'Option 2', exact: true }),
  ).toHaveValue('No');
  const box = await page.locator('canvas').boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(250);
  expect(Math.abs(box!.width - box!.height)).toBeLessThan(2);
  await expect
    .poll(async () =>
      page.locator('canvas').evaluate((canvas) => {
        const element = canvas as HTMLCanvasElement;
        const context = element.getContext('2d');
        return (
          context?.getImageData(element.width / 2, element.height / 2, 1, 1)
            .data[3] ?? 0
        );
      }),
    )
    .toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Add option' }).click();
  await page
    .getByRole('textbox', { name: 'Option 3', exact: true })
    .fill('Adventure');
  await page.locator('summary').click();
  await page.getByRole('switch', { name: /Weighted outcomes/ }).check();
  const weight = page.getByLabel('Weight for Adventure');
  await weight.fill('');
  await page.getByRole('textbox', { name: 'Option 1', exact: true }).focus();
  await expect(weight).toHaveValue('1');
  await weight.fill('4');
  await page.getByRole('textbox', { name: 'Option 1', exact: true }).focus();
  await page.getByLabel('Visual repeats').selectOption('2');

  await page.reload();
  await expect(
    page.getByRole('textbox', { name: 'Option 3', exact: true }),
  ).toHaveValue('Adventure');
  await page.locator('summary').click();
  await expect(
    page.getByRole('switch', { name: /Weighted outcomes/ }),
  ).toBeChecked();
  await expect(page.getByLabel('Weight for Adventure')).toHaveValue('4');
  await expect(page.getByLabel('Visual repeats')).toHaveValue('2');
  await expect(page.getByLabel('Start with a preset')).toHaveValue('');
  expect(errors).toEqual([]);
});

test('spin locks controls and returns an accessible semantic result', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: 'Spin the wheel', exact: true })
    .last()
    .click();
  await expect(page.getByRole('button', { name: 'Choosing…' })).toBeDisabled();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 2_000 });
  await expect(dialog.getByText(/Yes|No/, { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Spin the wheel', exact: true }).last(),
  ).toBeEnabled();
});

test('presets restore useful slice counts and custom state shows Select', async ({
  page,
}) => {
  const preset = page.getByLabel('Start with a preset');
  await preset.selectOption('maybe');
  await expect(
    page.getByRole('textbox', { name: 'Option 3', exact: true }),
  ).toHaveValue('Maybe');
  await preset.selectOption('meals');
  await expect(
    page.getByRole('textbox', { name: 'Option 6', exact: true }),
  ).toHaveValue('Surprise me');
  await page
    .getByRole('textbox', { name: 'Option 1', exact: true })
    .fill('Breakfast');
  await expect(preset).toHaveValue('');
});

test('roadmap has no main-app entry point and remains direct-address only', async ({
  page,
}) => {
  await expect(page.locator('a[href="#/roadmap"]')).toHaveCount(0);
  await expect(page.locator('a[href^="#/requirements/"]')).toHaveCount(0);
  await expect(page.getByText('Dice', { exact: true })).not.toHaveRole('link');
  await expect(page.getByText('Stats', { exact: true })).not.toHaveRole('link');

  await page.goto('/#/roadmap');
  await expect(page.locator('.card')).toHaveCount(entries.length);
  const category = entries[0].category;
  await page.getByRole('button', { name: category, exact: true }).click();
  await expect(page.locator('.card')).toHaveCount(
    entries.filter((entry) => entry.category === category).length,
  );
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.getByRole('searchbox').fill(entries[0].title);
  await expect(page.locator('.card')).toHaveCount(1);
  await page.locator('.card').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    entries[0].title,
  );
  for (const text of entries[0].acceptance) {
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  }
});

test('preview is responsive, keyboard reachable and free of external requests', async ({
  page,
}) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:'))
      external.push(request.url());
  });
  await page.reload();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Add option' }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('textbox', { name: 'Option 3', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Theme preview' }).click();
  await expect(
    page.getByRole('button', { name: 'Theme preview' }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(external).toEqual([]);
});

test('wheel, roadmap, detail and result dialog meet accessibility checks', async ({
  page,
}) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  for (const path of ['/', '/#/roadmap', `/#/requirements/${entries[0].id}`]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
  }
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Spin the wheel', exact: true })
    .last()
    .click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 2_000 });
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});

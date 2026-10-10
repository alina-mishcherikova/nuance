import { randomUUID } from 'node:crypto';
import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';
const origin = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
async function post(request: APIRequestContext, path: string, data: object) {
  return request.post(path, { headers: { Origin: origin }, data });
}
async function register(request: APIRequestContext) {
  const email = `stage2-${randomUUID()}@example.test`,
    password = `N-${randomUUID()}-9a!`;
  expect(
    (
      await post(request, '/api/auth/sign-up/email', {
        name: 'Stage two reader',
        email,
        password,
      })
    ).ok(),
  ).toBe(true);
  let otp = '';
  await expect
    .poll(async () => {
      const list = (await (
        await request.get('http://localhost:8025/api/v1/messages')
      ).json()) as { messages: { ID: string; To: { Address: string }[] }[] };
      const item = list.messages.find((m) =>
        m.To.some((t) => t.Address === email),
      );
      if (!item) return false;
      const detail = (await (
        await request.get(`http://localhost:8025/api/v1/message/${item.ID}`)
      ).json()) as { Text: string };
      otp = detail.Text.match(/\b\d{8}\b/)?.[0] ?? '';
      return !!otp;
    })
    .toBe(true);
  expect(
    (
      await post(request, '/api/auth/email-otp/verify-email', { email, otp })
    ).ok(),
  ).toBe(true);
  expect(
    (await post(request, '/api/auth/sign-in/email', { email, password })).ok(),
  ).toBe(true);
}
async function take(page: Page) {
  await page.goto('/en/catalog?category=couples');
  await page.locator('.quiz-card h2 a').first().click();
  await page.getByRole('button', { name: 'Take alone', exact: true }).click();
  await expect(page).toHaveURL(/\/solo\//);
}
async function complete(page: Page) {
  for (let i = 0; i < 4; i++) {
    if (i === 2)
      await page
        .locator('.question-inputs input[type=checkbox]')
        .first()
        .check();
    else
      await page.locator('.question-inputs input[type=radio]').last().check();
    await expect(page.getByRole('status')).toHaveText('Saved');
    if (i === 0) {
      await page.reload();
      await expect(page.locator('.question-inputs input:checked')).toHaveCount(
        1,
      );
    }
    await page
      .getByRole('button', {
        name: i < 3 ? 'Next' : 'Finish and see results',
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByRole('heading', { name: 'Your reflection', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Mean of your 1–5 scale answers: 5', { exact: true }),
  ).toBeVisible();
}
for (const locale of ['en', 'uk', 'fr'])
  test(`${locale}: catalog filters, mobile and axe`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto(`/${locale}/catalog`);
    await expect(page.locator('.quiz-card')).toHaveCount(6);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator('select[name=category]').selectOption('friends');
    await page.locator('.catalog-filters button').click();
    await expect(page.locator('.quiz-card')).toHaveCount(1);
    await page.locator('.quiz-card h2 a').click();
    await expect(page.locator('.quiz-panel h1')).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
test('guest completes, resumes, keeps private results and cannot use identifiers as credentials', async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await take(page);
  await expect(
    page.getByRole('button', { name: 'Next', exact: true }),
  ).toBeDisabled();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const id = page.url().split('/').at(-1)!;
  const stranger = await browser.newContext();
  expect(
    (await stranger.request.get(`${origin}/api/solo/${id}`)).status(),
  ).toBe(404);
  await complete(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const result = await page.request.get(`/api/solo/${id}`);
  expect(result.headers()['cache-control']).toBe('no-store');
  expect(result.headers()['x-robots-tag']).toContain('noindex');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Your reflection', exact: true }),
  ).toBeVisible();
  await stranger.close();
});
test('adult previews are absent before the gate and available only after confirmation', async ({
  page,
}) => {
  await page.goto('/en/catalog?search=Intimacy');
  await expect(page.locator('.quiz-card')).toHaveCount(0);
  expect(await page.content()).not.toContain('Intimacy, consent and comfort');
  await page.goto('/en/age');
  await page
    .getByRole('button', { name: 'I am 18 or older', exact: true })
    .click();
  await expect(page).toHaveURL(/\/catalog/);
  await page.goto('/en/catalog?search=Intimacy');
  await expect(page.locator('.quiz-card')).toHaveCount(1);
  await page.locator('.quiz-card h2 a').click();
  await expect(
    page.getByRole('heading', { name: 'Intimacy, consent and comfort' }),
  ).toBeVisible();
});
test('registered login, solo history and private localized authoring with a real image', async ({
  page,
  browser,
}) => {
  await register(page.request);
  await take(page);
  await complete(page);
  await page.goto('/en/account');
  await expect(
    page.getByRole('link', { name: 'Open private result' }),
  ).toBeVisible();
  await page.goto('/en/builder');
  await page
    .getByRole('button', { name: 'Create a draft', exact: true })
    .click();
  await expect(page).toHaveURL(/\/builder\//);
  const id = page.url().split('/').at(-1)!;
  for (const [locale, title, description, prompt] of [
    [
      'en',
      'Shared Sundays',
      'A gentle look at weekend routines.',
      'Would you enjoy a quiet Sunday?',
    ],
    [
      'uk',
      'Спільні неділі',
      'Спокійний погляд на вихідні.',
      'Чи сподобалася б вам спокійна неділя?',
    ],
    [
      'fr',
      'Dimanches partagés',
      'Un regard doux sur les habitudes du week-end.',
      'Aimeriez-vous un dimanche calme ?',
    ],
  ]) {
    await page.getByLabel(`Title (${locale})`, { exact: true }).fill(title!);
    await page
      .getByLabel(`Description (${locale})`, { exact: true })
      .fill(description!);
    await page
      .getByLabel(`Question (${locale})`, { exact: true })
      .fill(prompt!);
  }
  const image = await sharp({
    create: { width: 32, height: 32, channels: 3, background: '#a8432c' },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel('Cover image: Upload PNG, JPEG or WebP (max 5 MB)', {
      exact: true,
    })
    .setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: image });
  await expect(page.locator('img')).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Save draft', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Saved');
  const saved = (await (
    await page.request.get(`/api/drafts/${id}`)
  ).json()) as { document: { coverId: string; title: { fr: string } } };
  expect(saved.document.title.fr).toBe('Dimanches partagés');
  const ownImage = await page.request.get(
    `/api/media/${saved.document.coverId}`,
  );
  expect(ownImage.ok()).toBe(true);
  expect(ownImage.headers()['content-type']).toBe('image/webp');
  const stranger = await browser.newContext();
  expect(
    (await stranger.request.get(`${origin}/api/drafts/${id}`)).status(),
  ).toBe(401);
  expect(
    (
      await stranger.request.get(
        `${origin}/api/media/${saved.document.coverId}`,
      )
    ).status(),
  ).toBe(404);
  await page.reload();
  await expect(page.getByLabel('Title (en)', { exact: true })).toHaveValue(
    'Shared Sundays',
  );
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.preview-panel')).toContainText(
    'Would you enjoy a quiet Sunday?',
  );
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .getByRole('button', { name: 'Submit for review', exact: true })
    .click();
  await expect(
    page.getByText('Awaiting moderation', { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Title (en)', { exact: true })).toBeDisabled();
  await page.goto('/en/catalog?search=Shared+Sundays');
  await expect(page.locator('.quiz-card')).toHaveCount(0);
  await stranger.close();
});
test('stale tab saves conflict and final submission is idempotent', async ({
  page,
}) => {
  await take(page);
  const id = page.url().split('/').at(-1)!;
  const data = (await (await page.request.get(`/api/solo/${id}`)).json()) as {
    versionId: string;
    revision: number;
  };
  const responses: object[] = [];
  const input = {
    versionId: data.versionId,
    revision: data.revision,
    responses,
  };
  const [a, b] = await Promise.all([
    page.request.put(`/api/solo/${id}`, {
      headers: { Origin: origin },
      data: input,
    }),
    page.request.put(`/api/solo/${id}`, {
      headers: { Origin: origin },
      data: input,
    }),
  ]);
  expect([a.status(), b.status()].sort()).toEqual([200, 409]);
  expect(
    (
      await page.request.put(`/api/solo/${id}`, {
        headers: { Origin: 'https://untrusted.invalid' },
        data: input,
      })
    ).status(),
  ).toBe(403);
  await page.reload();
  await complete(page);
  const frozen = (await (await page.request.get(`/api/solo/${id}`)).json()) as {
    revision: number;
  };
  expect((await post(page.request, `/api/solo/${id}`, input)).ok()).toBe(true);
  expect(
    (
      await page.request.put(`/api/solo/${id}`, {
        headers: { Origin: origin },
        data: { ...input, revision: frozen.revision },
      })
    ).status(),
  ).toBe(409);
});

test('concurrent final submissions create one frozen result; API rejects invalid versions and uploads', async ({
  page,
  browser,
}) => {
  await page.goto('/en/catalog?category=friends');
  await page.locator('.quiz-card h2 a').click();
  await expect(page).toHaveURL(/\/quizzes\/[a-f0-9-]+$/);
  const versionId = page.url().split('/').at(-1)!;
  const published = (await (
    await page.request.get(`/api/quizzes/${versionId}`)
  ).json()) as {
    document: {
      questions: { id: string; type: string; options: { id: string }[] }[];
    };
  };
  const started = await post(page.request, '/api/solo', { versionId });
  expect(started.ok()).toBe(true);
  const { id } = (await started.json()) as { id: string };
  const responses = published.document.questions.map((q) =>
    q.type === 'SCALE'
      ? { questionId: q.id, type: q.type, value: 3 }
      : { questionId: q.id, type: q.type, options: [q.options[0]!.id] },
  );
  const input = { versionId, revision: 0, responses };
  const [a, b] = await Promise.all([
    post(page.request, `/api/solo/${id}`, input),
    post(page.request, `/api/solo/${id}`, input),
  ]);
  expect([a.status(), b.status()]).toEqual([200, 200]);
  const result = (await (await page.request.get(`/api/solo/${id}`)).json()) as {
    status: string;
    revision: number;
  };
  expect(result.status).toBe('SUBMITTED');
  expect(result.revision).toBe(1);
  expect(
    (await page.request.get(`/api/quizzes/${randomUUID()}`)).status(),
  ).toBe(404);
  expect((await page.request.get('/api/catalog?locale=xx')).status()).toBe(400);
  const stranger = await browser.newContext();
  expect(
    (
      await stranger.request.post(`${origin}/api/media`, {
        headers: { Origin: origin, 'Content-Type': 'image/png' },
        data: Buffer.from('fake'),
      })
    ).status(),
  ).toBe(401);
  await stranger.close();
  await register(page.request);
  expect(
    (
      await page.request.post('/api/media', {
        headers: { Origin: origin, 'Content-Type': 'image/png' },
        data: Buffer.from('fake png'),
      })
    ).status(),
  ).toBe(400);
});

test('auth forms cannot submit credentials before hydration', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${origin}/en/auth/login`);
  await expect(page.locator('form')).toHaveAttribute('method', 'post');
  await expect(page.getByLabel('Email address')).toBeDisabled();
  await expect(page.getByLabel('Password')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await context.close();
});

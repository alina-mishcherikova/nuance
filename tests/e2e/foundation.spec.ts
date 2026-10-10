import { randomUUID } from 'node:crypto';
import { test, expect, type APIRequestContext } from '@playwright/test';
import { Pool } from 'pg';
import AxeBuilder from '@axe-core/playwright';
const origin = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
async function post(request: APIRequestContext, path: string, data: object) {
  return request.post(`/api/auth/${path}`, {
    headers: { Origin: origin },
    data,
  });
}
async function code(request: APIRequestContext, email: string) {
  let found = '';
  await expect
    .poll(async () => {
      const inbox = await request.get('http://localhost:8025/api/v1/messages');
      const list = (await inbox.json()) as {
        messages: Array<{ ID: string; To: Array<{ Address: string }> }>;
      };
      const message = list.messages.find((item) =>
        item.To.some((to) => to.Address === email),
      );
      if (!message) return false;
      const detail = (await (
        await request.get(`http://localhost:8025/api/v1/message/${message.ID}`)
      ).json()) as { Text: string };
      found = detail.Text.match(/\b\d{8}\b/)?.[0] ?? '';
      return !!found;
    })
    .toBe(true);
  return found;
}
for (const locale of ['en', 'uk', 'fr'])
  test(`${locale}: 320px shell, keyboard, theme, dialog and axe`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        /Content Security Policy|Refused to/.test(message.text())
      )
        errors.push('CSP violation');
    });
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto(`/${locale}`);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('h1')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (locale === 'en' && process.env.NUANCE_CAPTURE_PUBLIC === '1') {
      await page.screenshot({
        path: '/tmp/nuance-home-mobile.png',
        fullPage: true,
      });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.screenshot({
        path: '/tmp/nuance-home-desktop.png',
        fullPage: true,
      });
      await page.setViewportSize({ width: 320, height: 740 });
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      ),
    ).toBe('auto');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    await page.locator('.preferences button').first().click();
    const dark = await page
      .locator('html')
      .evaluate((el) => el.classList.contains('dark'));
    await page.reload();
    expect(
      await page
        .locator('html')
        .evaluate((el) => el.classList.contains('dark')),
    ).toBe(dark);
    await page.locator('footer button').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
  });
test('locale switching keeps current route and account is guarded', async ({
  page,
}) => {
  await page.goto('/en/auth/login');
  await page.getByRole('combobox').selectOption('fr');
  await expect(page).toHaveURL(/\/fr\/auth\/login/);
  await page.goto('/uk/account');
  await expect(page).toHaveURL(/\/uk\/auth\/login/);
  const denied = await page.goto('/en/moderation');
  expect(denied?.headers()['cache-control']).toContain('no-store');
  expect(denied?.headers()['x-robots-tag']).toContain('noindex');
  await expect(
    page.getByRole('heading', { name: 'You don’t have access to this area.' }),
  ).toBeVisible();
});
test('real registration, verification, login, reset, logout, replay and access denials', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const email = `stage1-${randomUUID()}@example.test`;
  const password = `Nuance-${randomUUID()}`;
  const nextPassword = `Changed-${randomUUID()}`;
  await page.goto('/en/auth/signup');
  await page.getByLabel('Your name').fill('Stage One');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('status')).toContainText('code has been sent');
  expect((await post(request, 'sign-in/email', { email, password })).ok()).toBe(
    false,
  );
  const otp = await code(request, email);
  await page.goto('/en/auth/verify');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Email code').fill(otp);
  await page
    .getByRole('button', { name: 'Confirm email', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('Email confirmed');
  expect(
    (await post(request, 'email-otp/verify-email', { email, otp })).ok(),
  ).toBe(false);
  await page.goto('/en/auth/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/en\/account/);
  await expect(page.getByText('Stage One', { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto('/en/moderation');
  await expect(
    page.getByRole('heading', { name: 'You don’t have access to this area.' }),
  ).toBeVisible();
  const rolePool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await rolePool.query("UPDATE users SET role='moderator' WHERE email=$1", [
      email,
    ]);
    await page.goto('/en/moderation');
    await expect(
      page.getByRole('heading', { name: 'Moderation boundary' }),
    ).toBeVisible();
    await rolePool.query("UPDATE users SET role='user' WHERE email=$1", [
      email,
    ]);
    await page.goto('/en/moderation');
    await expect(
      page.getByRole('heading', {
        name: 'You don’t have access to this area.',
      }),
    ).toBeVisible();
  } finally {
    await rolePool.query("UPDATE users SET role='user' WHERE email=$1", [
      email,
    ]);
    await rolePool.end();
  }
  await page.goto('/en/auth/reset');
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Send reset code' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  const reset = await code(request, email);
  await page.goto('/en/auth/new-password');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(nextPassword);
  await page.getByLabel('Email code').fill(reset);
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(page.getByRole('status')).toContainText('Password updated');
  await page.goto('/en/account');
  await expect(page).toHaveURL(/\/en\/auth\/login/);
  expect(
    (
      await post(request, 'email-otp/reset-password', {
        email,
        otp: reset,
        password,
      })
    ).ok(),
  ).toBe(false);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(nextPassword);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/en\/account/);
  const oldCookies = (await page.context().cookies())
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/en\/auth\/login/);
  await page.goto('/en/account');
  await expect(page).toHaveURL(/\/en\/auth\/login/);
  const replay = await request.get('/en/account', {
    headers: { Cookie: oldCookies },
  });
  // An async Server Component may stream a meta redirect with HTTP 200.
  // Assert the authorization outcome, not the transport's redirect mechanism.
  const deniedHtml = await replay.text();
  expect(deniedHtml.includes('/en/auth/login')).toBe(true);
  expect(deniedHtml.includes(email)).toBe(false);
  expect(deniedHtml.includes('Stage One')).toBe(false);
  const revokedPool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const active = await revokedPool.query(
      'SELECT count(*)::int AS count FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE u.email=$1',
      [email],
    );
    expect(active.rows[0]?.count).toBe(0);
  } finally {
    await revokedPool.end();
  }
  expect(
    (
      await request.post('/api/auth/sign-up/email', {
        headers: { Origin: 'https://attacker.invalid' },
        data: { name: 'Attack', email, password },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await post(request, 'sign-up/email', {
        name: 'Attack',
        email,
        password,
        role: 'admin',
      })
    ).status(),
  ).toBe(400);
  expect(
    (await post(request, 'update-user', { name: 'Attack' })).status(),
  ).toBe(404);
});
test('generic credential errors and principal rate limiting', async ({
  request,
}) => {
  const email = `absent-${randomUUID()}@example.test`;
  const statuses: number[] = [];
  for (let i = 0; i < 7; i++) {
    const res = await post(request, 'sign-in/email', {
      email,
      password: 'example-long-password',
    });
    statuses.push(res.status());
    expect(await res.json()).toEqual({ error: 'AUTH_REQUEST_FAILED' });
  }
  expect(statuses).toContain(429);
});

// Clear secret input values before Playwright can produce a failure context.
test.afterEach(async ({ page }) => {
  if (!page.isClosed())
    await page
      .locator('input')
      .evaluateAll((inputs) =>
        inputs.forEach((input) => ((input as HTMLInputElement).value = '')),
      );
});
test('email codes are hashed, expire, and consume atomically under concurrent verification', async ({
  request,
}) => {
  const email = `expiry-${randomUUID()}@example.test`;
  const password = `Nuance-${randomUUID()}`;
  expect(
    (
      await post(request, 'sign-up/email', { name: 'Expiry', email, password })
    ).ok(),
  ).toBe(true);
  const otp = await code(request, email);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const records = await pool.query(
      'SELECT value FROM verification_tokens WHERE identifier LIKE $1',
      ['%' + email + '%'],
    );
    expect(records.rowCount).toBe(1);
    expect(
      records.rows.every(
        (row: { value: string }) => !row.value.startsWith(otp),
      ),
    ).toBe(true);
    await pool.query(
      "UPDATE verification_tokens SET expires_at=now()-interval '1 second' WHERE identifier LIKE $1",
      ['%' + email + '%'],
    );
    expect(
      (await post(request, 'email-otp/verify-email', { email, otp })).ok(),
    ).toBe(false);
    expect(
      (
        await post(request, 'email-otp/send-verification-otp', {
          email,
          type: 'email-verification',
        })
      ).ok(),
    ).toBe(true);
    // Wait for a distinct rotated code, rather than reusing the previous email.
    let rotated = '';
    await expect
      .poll(async () => {
        rotated = await code(request, email);
        return rotated !== otp;
      })
      .toBe(true);
    const attempts = await Promise.all([
      post(request, 'email-otp/verify-email', { email, otp: rotated }),
      post(request, 'email-otp/verify-email', { email, otp: rotated }),
    ]);
    expect(attempts.filter((result) => result.ok()).length).toBe(1);
  } finally {
    await pool.query('DELETE FROM users WHERE email=$1', [email]);
    await pool.end();
  }
});

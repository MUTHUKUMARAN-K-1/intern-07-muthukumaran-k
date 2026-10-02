import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

const DEMO_PASSWORD = 'demo-pillsync-2026'; // pragma: allowlist secret - local DEBUG-only accounts

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/Email address/).fill(email);
  await page.getByLabel(/^Password/).fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

test('patient completes prescription review, dose action, history and analytics', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/register');
  await page.getByLabel(/Full name/).fill('Workflow Test Patient');
  await page.getByLabel(/Email address/).fill(`workflow.${randomUUID()}@example.com`);
  await page.getByLabel(/^Password/).fill(DEMO_PASSWORD);
  await page.getByLabel(/Repeat password/).fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

  await page.goto('/scan');
  await page.getByRole('tab', { name: 'Type or paste' }).click();
  await page.getByLabel('Prescription text').fill('Tab Metformin 500 mg 1-0-1 x 30 days Qty 60');
  await page.getByRole('button', { name: 'Find the medicines' }).click();
  await expect(page.getByRole('heading', { name: '1 medicine found' })).toBeVisible();
  // Human review and stock confirmation happen through the UI, not an API shortcut.
  await page.getByLabel('Units you have').fill('60');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('button', { name: 'Add to my medicines', exact: true }).click();
  await expect(page.getByRole('heading', { name: '1 medicine added' })).toBeVisible();

  // Keep a dose on today's list even when CI runs after the parsed evening time.
  // Registration uses UTC; the authenticated API adjusts only the test schedule.
  const access = await page.evaluate(() => localStorage.getItem('pillsync.access'));
  const headers = { Authorization: `Bearer ${access}` };
  const schedulesResponse = await page.request.get('/api/v1/schedules/', { headers });
  expect(schedulesResponse.ok()).toBe(true);
  const schedules = await schedulesResponse.json();
  const schedule = (schedules.results || schedules)[0];
  const adjusted = await page.request.patch(`/api/v1/schedules/${schedule.id}/`, {
    headers,
    data: { time_of_day: '23:59:59' },
  });
  expect(adjusted.ok()).toBe(true);

  await page.goto('/today');
  await expect(page.getByRole('button', { name: 'Taken', exact: true }).first()).toBeVisible();
  const pendingBefore = await page.getByRole('button', { name: 'Taken', exact: true }).count();
  const dose = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('button', { name: 'Taken', exact: true }) })
    .first();
  await dose.getByRole('button', { name: 'Taken', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Taken', exact: true })).toHaveCount(
    pendingBefore - 1
  );
  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'Medication history' })).toBeVisible();
  await expect(page.getByText('Taken', { exact: true }).first()).toBeVisible();
  await page.goto('/refills');
  await expect(page.getByRole('heading', { name: 'Refills', exact: true })).toBeVisible();
  await expect(page.getByText(/Metformin/).first()).toBeVisible();
  await page.goto('/adherence');
  await expect(page.getByRole('heading', { name: 'Adherence', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(errors).toEqual([]);
});

test('caregiver sees assigned patients and cannot open administration', async ({ page }) => {
  await login(page, 'meera.rao@pillsync.example');
  await expect(page.getByRole('heading', { name: 'People I look after' })).toBeVisible();
  await page.goto('/patients');
  await expect(page.getByText('Asha Rao', { exact: true })).toBeVisible();
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/forbidden$/);
});

test('administrator gets platform analytics and account management', async ({ page }) => {
  await login(page, 'admin.demo@pillsync.example');
  await page.goto('/admin/analytics');
  await expect(page.getByRole('heading', { name: 'Platform analytics' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reminder delivery' })).toBeVisible();
  await page.goto('/admin/users');
  await expect(page.getByText('Asha Rao', { exact: true })).toBeVisible();
});

test('password reset and notifications are accessible on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/forgot-password');
  await page.getByLabel(/Email address/).fill('nobody@example.com');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('status')).toContainText('If that email is registered');
  await page.goto('/reset-password');
  await expect(page.getByRole('button', { name: 'Save new password' })).toBeDisabled();
  await login(page, 'asha.rao@pillsync.example');
  await page.goto('/notifications');
  await expect(page.getByRole('heading', { name: 'Browser reminders' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save settings' })).toBeVisible();
  const noOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth
  );
  expect(noOverflow).toBe(true);
});

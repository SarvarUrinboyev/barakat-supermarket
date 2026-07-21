import { expect, test } from '@playwright/test';

const SIDEBAR_ROUTES = Object.freeze([
  '/shops', '/billing', '/accounting', '/integrations', '/devices', '/savdograph',
  '/payments', '/warehouse', '/customers', '/dashboard', '/pos', '/promos',
  '/home-expenses', '/orders', '/debt', '/calculator', '/reports', '/help',
]);

const TARGET_ROUTES = Object.freeze([
  '/payments', '/warehouse', '/customers', '/promos', '/debt', '/dashboard', '/savdograph',
]);

const VIEWPORTS = Object.freeze([
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
]);

const ENGLISH_UI_FAILURES = [
  /\[English translation unavailable\]/,
  /(?:\bOmbor\b|\bMahsulotlar\b|\bMijozlar\b|\bAksiyalar\b|\bTo'lov\b|\bBugun\b|\bKecha\b|\bQarz\b|\bBoshqaruv\b|\bHisobotlar\b|\bKalkulyator\b|\bBog'lanish\b)/,
  /[\u0400-\u04ff]/,
];

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(body),
  });
}

async function installAuthenticatedEnglishMock(page) {
  const state = { consoleErrors: [], pageErrors: [] };
  page.on('console', (message) => {
    if (message.type() === 'error') state.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => state.pageErrors.push(error.message));

  await page.addInitScript(() => {
    localStorage.setItem('savdopro.token', 'english-route-matrix-session');
    localStorage.setItem('savdopro.activeShopId', '1');
    localStorage.setItem('barakat.lang', 'en');
  });

  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (!pathname.startsWith('/api/')) return route.continue();
    if (pathname === '/api/license/auth/me') {
      return json(route, {
        userId: 1,
        username: 'demo_owner',
        fullName: 'Demo Owner',
        role: 'ACCOUNT_OWNER',
        accountId: 90001,
        accountName: 'Demo Store',
        blocked: false,
        enabledModules: null,
        permissions: ['SAVDOGRAPH:READ', 'SAVDOGRAPH:WRITE', 'SAVDOGRAPH:DECIDE', 'SAVDOGRAPH_LEDGER:READ'],
      });
    }
    if (pathname === '/api/shops') return json(route, [{ id: 1, name: 'Demo Store', main: true }]);
    if (pathname === '/api/license/billing/status') {
      return json(route, {
        plan: 'TRIAL', expired: false, daysRemaining: 14, maxUsers: 5, currentUsers: 1,
        maxShops: 1, currentShops: 1, subscriptionExpires: '2026-12-31',
      });
    }
    if (pathname === '/api/license/billing/payments') return json(route, []);
    if (pathname === '/api/products') {
      return json(route, [{
        id: 11, name: 'Demo product', barcode: '4780000000011', categoryId: null,
        categoryName: '', quantity: 4, stockQty: 4, stockStatus: 'IN_STOCK',
        stockValue: 12026200, margin: 907200, purchasePrice: 2500000,
        salePrice: 3407200, currency: 'UZS',
      }]);
    }
    if (pathname === '/api/categories') return json(route, []);
    if (pathname === '/api/payments') {
      return json(route, { payments: [{
        id: 1, date: '2026-07-22', direction: 'INCOMING', category: 'CUSTOMER',
        party: 'Demo customer', method: 'NAQD', currency: 'UZS', amount: 1200000, source: 'PAYMENT',
      }] });
    }
    if (pathname === '/api/customers') {
      return json(route, [{
        id: 1, name: 'Demo customer', phone: '+998901234567', address: '',
        pointsBalance: 0, balanceUzs: 330000, balanceUsd: 0, transactions: [],
      }]);
    }
    if (pathname === '/api/debts/summary') {
      return json(route, { customerDebts: [], myDebts: [], customerDebtTotal: 0, myDebtTotal: 0 });
    }
    if (pathname === '/api/promos') return json(route, []);
    if (pathname === '/api/balance/today') return json(route, { startingCash: 0 });
    if (pathname === '/api/dashboard') {
      return json(route, {
        startingCash: 0, estimatedCash: 0, todayExpenseTotal: 0,
        todayNaqd: 0, todayKarta: 0, todayKassa: 0, totalDebt: 0,
        topExpenses: [], ordersToday: [], ordersTomorrow: [], ordersOverdue: [],
      });
    }
    if (pathname === '/api/exchange-rate') return json(route, { available: false, rate: 0 });
    // Empty successful fixtures keep this visual journey free of intentionally
    // generated HTTP failures; unit coverage asserts the localized error path.
    return json(route, null);
  });
  return state;
}

async function waitForRouteUi(page, state, route) {
  await expect.poll(() => state.pageErrors, { message: `page errors before ${route}` }).toEqual([]);
  await expect(page.locator('.lang-select')).toHaveValue('en');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('en');
  await expect(page.locator('.app-shell')).toBeVisible();
  await page.waitForTimeout(100);
}

async function assertEnglishUi(page) {
  // The global selector intentionally lists the other three locale names. It
  // is the sole allowlisted multilingual control; inspect the rest of the app.
  const text = await page.locator('.app-shell').evaluate((shell) => {
    const clone = shell.cloneNode(true);
    clone.querySelectorAll('.lang-select').forEach((select) => select.remove());
    return clone.innerText;
  });
  for (const pattern of ENGLISH_UI_FAILURES) {
    expect(text, `English UI matched ${pattern}`).not.toMatch(pattern);
  }
}

async function assertNoHorizontalOverflow(page, viewport) {
  const geometry = await page.evaluate(() => ({
    document: [document.documentElement.clientWidth, document.documentElement.scrollWidth],
    body: [document.body.clientWidth, document.body.scrollWidth],
  }));
  expect(geometry.document[0]).toBe(viewport.width);
  expect(geometry.document[1]).toBeLessThanOrEqual(geometry.document[0] + 1);
  expect(geometry.body[1]).toBeLessThanOrEqual(geometry.body[0] + 1);
}

test('authenticated sidebar route matrix keeps English selected and renders no mixed-language UI', async ({ page }) => {
  const state = await installAuthenticatedEnglishMock(page);
  await page.setViewportSize(VIEWPORTS[0]);
  await page.goto('/dashboard');
  await waitForRouteUi(page, state, '/dashboard');

  const actualSidebarRoutes = await page.locator('.sidebar-nav a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  expect(actualSidebarRoutes).toEqual(SIDEBAR_ROUTES);

  for (const route of actualSidebarRoutes) {
    await page.goto(route);
    await waitForRouteUi(page, state, route);
    await assertEnglishUi(page);
  }

  expect(state.consoleErrors, `console errors: ${state.consoleErrors.join(' | ')}`).toEqual([]);
  expect(state.pageErrors, `page errors: ${state.pageErrors.join(' | ')}`).toEqual([]);
});

test('target English routes have no overflow and keep tagged UZS values out of dollar formatting at all release viewports', async ({ page }) => {
  const state = await installAuthenticatedEnglishMock(page);

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    for (const route of TARGET_ROUTES) {
      await page.goto(route);
      await waitForRouteUi(page, state, route);
      await assertEnglishUi(page);
      await assertNoHorizontalOverflow(page, viewport);
    }
  }

  await page.setViewportSize(VIEWPORTS[0]);
  await page.goto('/warehouse');
  await waitForRouteUi(page, state, '/warehouse');
  await expect(page.locator('body')).toContainText('12,026,200 UZS');
  await expect(page.locator('body')).not.toContainText('$12,026,200');

  await page.goto('/debt');
  await waitForRouteUi(page, state, '/debt');
  await expect(page.locator('.debt-stat.recv')).toContainText('330,000 UZS');
  await expect(page.locator('.debt-stat.recv')).not.toContainText('$330,000');

  expect(state.consoleErrors, `console errors: ${state.consoleErrors.join(' | ')}`).toEqual([]);
  expect(state.pageErrors, `page errors: ${state.pageErrors.join(' | ')}`).toEqual([]);
});

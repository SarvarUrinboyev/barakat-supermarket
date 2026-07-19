import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

test('global topbar remains contained, accessible, and operable at release viewports', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.addInitScript(() => {
    localStorage.setItem('savdopro.token', 'mock-owner-token');
    localStorage.setItem('savdopro.activeShopId', '1');
    localStorage.setItem('savdopro.sidebar.collapsed', '1');
  });

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const json = (body) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
    if (url.pathname === '/api/auth/me') {
      return json({
        userId: 1,
        username: 'demo_owner',
        fullName: 'Demo Owner',
        role: 'ACCOUNT_OWNER',
        accountId: 90001,
        accountName: 'Anonymized Demo Store',
        blocked: false,
        enabledModules: null,
        permissions: ['SAVDOGRAPH:READ', 'SAVDOGRAPH:WRITE', 'SAVDOGRAPH:DECIDE', 'SAVDOGRAPH_LEDGER:READ'],
      });
    }
    if (url.pathname === '/api/shops') {
      return json([
        { id: 1, name: 'Anonymized Demo Neighborhood Store With Extended Location Name', main: true },
        { id: 2, name: 'Anonymized Demo Branch', main: false },
      ]);
    }
    if (url.pathname === '/api/billing/current') return json({ status: 'ACTIVE', planName: 'Demo' });
    return json([]);
  });

  await page.setViewportSize(VIEWPORTS[0]);
  await page.goto('/savdograph');
  await page.waitForLoadState('domcontentloaded');
  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  await expect(page.getByTestId('savdograph-workspace')).toBeVisible();
  await page.evaluate(() => {
    window.__b5TopbarResizeCount = 0;
    window.addEventListener('resize', () => { window.__b5TopbarResizeCount += 1; });
  });

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await expect(page.locator('.topbar')).toBeVisible();
    if (viewport.width <= 720) {
      await expect.poll(
        () => page.locator('.sidebar').evaluate((element) => element.getBoundingClientRect().right),
      ).toBeLessThanOrEqual(1);
    }

    const geometry = await page.evaluate(() => {
      const rectOf = (selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
      };
      const topbar = document.querySelector('.topbar');
      const shopName = document.querySelector('.shop-switcher-button .ss-name');
      return {
        document: {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        },
        body: {
          clientWidth: document.body.clientWidth,
          scrollWidth: document.body.scrollWidth,
        },
        topbar: rectOf('.topbar'),
        topbarChildren: [...topbar.children]
          .filter((element) => getComputedStyle(element).display !== 'none')
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return { className: element.className, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
          }),
        right: rectOf('.topbar .right'),
        rightControls: [...document.querySelectorAll('.topbar .right > *')]
          .filter((element) => getComputedStyle(element).display !== 'none')
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return { className: element.className, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
          }),
        shop: rectOf('.shop-switcher-button'),
        shopName: {
          clientWidth: shopName.clientWidth,
          scrollWidth: shopName.scrollWidth,
          overflow: getComputedStyle(shopName).overflow,
          textOverflow: getComputedStyle(shopName).textOverflow,
          whiteSpace: getComputedStyle(shopName).whiteSpace,
        },
        content: rectOf('.content'),
        workspace: rectOf('[data-testid="savdograph-workspace"]'),
        workspaceScrollWidth: document.querySelector('[data-testid="savdograph-workspace"]').scrollWidth,
        workspaceClientWidth: document.querySelector('[data-testid="savdograph-workspace"]').clientWidth,
      };
    });

    console.log(`TOPBAR_GEOMETRY ${viewport.width}x${viewport.height} ${JSON.stringify(geometry)}`);
    expect(geometry.document.clientWidth).toBe(viewport.width);
    expect(geometry.document.scrollWidth).toBeLessThanOrEqual(geometry.document.clientWidth + 1);
    expect(geometry.body.scrollWidth).toBeLessThanOrEqual(geometry.body.clientWidth + 1);
    expect(geometry.topbar.left).toBeGreaterThanOrEqual(-1);
    expect(geometry.topbar.right).toBeLessThanOrEqual(geometry.document.clientWidth + 1);
    for (const child of geometry.topbarChildren) {
      expect(child.left, child.className).toBeGreaterThanOrEqual(-1);
      expect(child.right, child.className).toBeLessThanOrEqual(geometry.document.clientWidth + 1);
    }
    for (const control of geometry.rightControls) {
      expect(control.width, control.className).toBeGreaterThan(0);
      expect(control.right, control.className).toBeLessThanOrEqual(geometry.document.clientWidth + 1);
    }
    expect(geometry.shop.left).toBeGreaterThanOrEqual(-1);
    expect(geometry.shop.right).toBeLessThanOrEqual(geometry.document.clientWidth + 1);
    expect(geometry.shopName.scrollWidth).toBeGreaterThan(geometry.shopName.clientWidth);
    expect(geometry.shopName.overflow).toBe('hidden');
    expect(geometry.shopName.textOverflow).toBe('ellipsis');
    expect(geometry.shopName.whiteSpace).toBe('nowrap');
    expect(geometry.content.right).toBeLessThanOrEqual(geometry.document.clientWidth + 1);
    expect(geometry.workspace.right).toBeLessThanOrEqual(geometry.document.clientWidth + 1);
    expect(geometry.workspaceScrollWidth).toBeLessThanOrEqual(geometry.workspaceClientWidth + 1);

    const shopSwitcher = page.locator('.shop-switcher-button');
    await expect(shopSwitcher).toBeVisible();
    await expect(shopSwitcher).toHaveAccessibleName(/Anonymized Demo Neighborhood Store With Extended Location Name/);
    await expect(page.locator('.topbar .lang-select')).toBeVisible();
    await expect(page.locator('.topbar .icon-btn')).toBeVisible();

    if (viewport.width === 1440) {
      await expect(page.locator('.topbar')).toHaveCSS('height', '64px');
      await expect(page.getByRole('button', { name: /Menyuni kengaytirish/ })).toBeVisible();
    }
    if (viewport.width <= 720) {
      await expect(page.locator('.topbar .date')).toBeHidden();
      await expect(shopSwitcher).toHaveCSS('min-height', '44px');

      await shopSwitcher.focus();
      await expect(shopSwitcher).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('.shop-switcher')).toHaveClass(/open/);
      await page.keyboard.press('Enter');
      await expect(page.locator('.shop-switcher')).not.toHaveClass(/open/);

      const themeButton = page.locator('.topbar .icon-btn');
      await themeButton.focus();
      await expect(themeButton).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await page.keyboard.press('Enter');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

      const language = page.locator('.topbar .lang-select');
      await language.selectOption('ru');
      await expect(language).toHaveValue('ru');
      await language.selectOption('uz');
      await expect(language).toHaveValue('uz');

      const menuButton = page.getByRole('button', { name: 'Menyu' });
      await expect(menuButton).toHaveAccessibleName('Menyu');
      await menuButton.focus();
      await page.keyboard.press('Enter');
      await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Escape');
      await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    }
  }

  expect(await page.evaluate(() => window.__b5TopbarResizeCount)).toBeLessThanOrEqual(12);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

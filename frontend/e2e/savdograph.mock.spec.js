import path from 'node:path';
import { test, expect } from '@playwright/test';

const evidence = {
  id: 101,
  evidenceType: 'GROSS_PROFIT',
  periodFrom: '2026-07-18',
  periodTo: '2026-07-19',
  calculationId: 'gross-profit-v1',
  calculationVersion: '1.0.0',
  inputData: JSON.stringify({ startInclusive: '2026-07-18', endExclusive: '2026-07-19', shopId: 99 }),
  calculatedResult: '1250000.0000',
  unit: 'UZS',
  currency: 'UZS',
  contentHash: 'recorded-not-rendered',
  createdAt: '2026-07-18T12:00:00',
};
const JOURNEY_VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];


async function runDecisionJourney(page, viewport, captureScreenshots = false) {
  const bridgeBodies = [];
  const decisionBodies = [];
  let ledger = [];
  let nextAnalysisRunId = 600;
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.addInitScript(() => {
    localStorage.setItem('savdopro.token', 'mock-owner-token');
    localStorage.setItem('savdopro.activeShopId', '1');
    localStorage.setItem('savdopro.licenseUrl', 'http://127.0.0.1:9090');
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    if (!path.startsWith('/api/')) return route.continue();
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (path === '/api/auth/me') {
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
    if (path === '/api/shops') return json([{ id: 1, name: 'Demo Store', main: true }]);
    if (path === '/api/billing/current') return json({ status: 'ACTIVE', planName: 'Demo' });
    if (path === '/api/savdograph/action-ledger') return json(ledger);
    if (path === '/api/savdograph/gross-profit-briefs' && method === 'POST') {
      return json({
        analysisRunId: 501,
        label: 'Daily Gross Profit Brief',
        classification: 'VERIFIED',
        periodStart: '2026-07-18',
        periodEnd: '2026-07-19',
        timezone: 'Asia/Tashkent',
        currency: 'UZS',
        revenueUzs: '5000000.0000',
        cogsUzs: '3750000.0000',
        grossProfitUzs: '1250000.0000',
        grossMarginPercent: '25.0000',
        grossMarginState: 'AVAILABLE',
        completedSaleCount: 12,
        sourceSaleItemCount: 18,
        refundedAmountUzs: '0.0000',
        assumptions: [],
        limitations: [],
        calculationId: 'gross-profit-v1',
        calculationVersion: '1.0.0',
        generatedAt: '2026-07-18T12:00:00',
        evidenceIds: { grossProfit: 101 },
      }, 201);
    }
    if (path === '/api/savdograph/ask' && method === 'POST') {
      return json({
        interactionId: 'ask-demo-1',
        model: 'gpt-5.6',
        promptVersion: 'b3-v1',
        status: 'ANSWERED',
        language: 'uz',
        answer: 'Bugungi yalpi foyda 1 250 000 UZS.',
        classification: 'VERIFIED',
        facts: [{ label: 'Yalpi foyda', value: '1250000.0000', unit: 'UZS', evidence_ids: [101], classification: 'VERIFIED' }],
        assumptions: [],
        limitations: ['Net profit hisoblanmaydi.'],
        toolsUsed: ['gross_profit_brief'],
        evidenceIds: [101],
        suggestedNextActions: [{ type: 'OPEN_EVIDENCE', label: 'Dalilni tekshirish', requires_human_action: true }],
        generatedAt: '2026-07-18T12:01:00',
      });
    }
    if (path === '/api/savdograph/evidence-items/101') return json(evidence);
    if (path === '/api/products') return json([{ id: 77, name: 'Green Tea 100g', barcode: 'SKU-TEA-100', quantity: 3, unit: 'PCS', costPrice: 'SENSITIVE-NOT-RENDERED' }]);
    if (path === '/api/savdograph/reorder-simulations' && method === 'POST') {
      const analysisRunId = ++nextAnalysisRunId;
      return json({
        analysisRunId,
        classification: 'ESTIMATED',
        productId: 77,
        productSku: 'SKU-TEA-100',
        unit: 'PCS',
        currentOnHandQuantity: 3,
        lookbackStart: '2026-06-19',
        lookbackEnd: '2026-07-19',
        netUnitsSold: '30.0000',
        velocityUnitsPerDay: '1.0000',
        leadTimeDays: 2,
        safetyStockDays: 3,
        forecastHorizonDays: 7,
        reorderQuantity: 9,
        coverageBeforeDays: '3.0000',
        coverageAfterDays: '12.0000',
        stockoutRisk: 'MEDIUM',
        overstockRisk: 'LOW',
        tiedUpCapitalUzs: null,
        tiedUpCapitalState: 'INSUFFICIENT_DATA',
        assumptions: ['Historical velocity continues for the scenario horizon.'],
        risks: ['Future demand can differ.'],
        limitations: ['Incoming stock is not inferred.'],
        calculationId: 'reorder-v1',
        calculationVersion: '1.0.0',
        generatedAt: '2026-07-18T12:02:00',
        evidenceIds: { reorderQuantity: 101 },
      }, 201);
    }
    if (path === '/api/suppliers') return json([{ id: 31, name: 'Demo Supplier', phone: 'SENSITIVE-NOT-RENDERED' }]);
    const proposalMatch = path.match(/^\/api\/savdograph\/reorder-simulations\/(\d+)\/proposals$/);
    if (proposalMatch && method === 'POST') {
      const analysisRunId = Number(proposalMatch[1]);
      const proposalId = analysisRunId + 100;
      bridgeBodies.push(request.postDataJSON());
      return json({
        proposalId,
        proposalStatus: 'PROPOSED',
        sourceKind: 'REORDER_SIMULATION',
        sourceAnalysisRunId: analysisRunId,
        productId: 77,
        productDisplayName: 'Green Tea 100g',
        supplierId: 31,
        supplierDisplayName: 'Demo Supplier',
        reorderQuantity: 9,
        classification: 'ESTIMATED',
        assumptions: ['Historical velocity continues for the scenario horizon.'],
        risks: ['Future demand can differ.'],
        limitations: ['Incoming stock is not inferred.'],
        evidenceIds: [101],
        createdAt: '2026-07-18T12:03:00',
        idempotent: false,
      }, 201);
    }
    if (path === '/api/savdograph/proposals/701/approve' && method === 'POST') {
      decisionBodies.push({ kind: 'approve', body: request.postDataJSON() });
      ledger = [{
        id: 802,
        proposalId: 701,
        proposalDecisionId: 901,
        actor: 'Demo Owner',
        evidenceReferences: '[101]',
        eventType: 'DRAFT_PURCHASE_ORDER_CREATED',
        outcome: 'SUCCESS',
        purchaseOrderId: 1001,
        details: 'Draft-only purchase order created; no supplier notification or operational action.',
        createdAt: '2026-07-18T12:04:01',
      }, {
        id: 801,
        proposalId: 701,
        proposalDecisionId: 901,
        actor: 'Demo Owner',
        evidenceReferences: '[101]',
        eventType: 'PROPOSAL_APPROVED',
        outcome: 'SUCCESS',
        purchaseOrderId: 1001,
        details: 'Human approval recorded.',
        createdAt: '2026-07-18T12:04:00',
      }];
      return json({ proposalId: 701, decision: 'APPROVE', proposalStatus: 'DRAFT_CREATED', purchaseOrderId: 1001, idempotent: false, decidedAt: '2026-07-18T12:04:00' });
    }
    if (path === '/api/savdograph/proposals/702/reject' && method === 'POST') {
      decisionBodies.push({ kind: 'reject', body: request.postDataJSON() });
      ledger = [{
        id: 803,
        proposalId: 702,
        proposalDecisionId: 902,
        actor: 'Demo Owner',
        evidenceReferences: '[101]',
        eventType: 'PROPOSAL_REJECTED',
        outcome: 'SUCCESS',
        purchaseOrderId: null,
        details: 'Human rejection recorded.',
        createdAt: '2026-07-18T12:05:00',
      }, ...ledger];
      return json({ proposalId: 702, decision: 'REJECT', proposalStatus: 'REJECTED', purchaseOrderId: null, idempotent: false, decidedAt: '2026-07-18T12:05:00' });
    }
    return json(method === 'GET' ? [] : {});
  });

  await page.setViewportSize(viewport);
  await page.goto('/savdograph');
  await page.waitForLoadState('domcontentloaded');
  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  await expect(page.getByTestId('savdograph-workspace')).toBeVisible();
  await expect(page.locator('a[href="/savdograph"]')).toBeVisible();
  await expect(page.getByRole('note', { name: /Demo ma\u2019lumotlar/ })).toContainText(/Demo ma\u2019lumotlar/);

  await page.locator('section:has(#sg-brief)').getByRole('button', { name: /Brief yaratish/ }).click();
  await expect(page.locator('[data-result="gross-profit-brief"]')).toContainText('1250000.0000 UZS');

  await page.locator('section:has(#sg-ask)').getByRole('button', { name: /Bugungi yalpi foyda/ }).click();
  await page.locator('section:has(#sg-ask)').getByRole('button', { name: 'So\u2018rash', exact: true }).click();
  await expect(page.locator('[data-result="ask-store"]')).toContainText('Bugungi yalpi foyda');
  const evidenceButton = page.locator('[data-result="ask-store"]').getByRole('button', { name: /Dalilni ochish 101/ }).first();
  await evidenceButton.click();
  await expect(page.getByRole('dialog', { name: /Dalil ko\u2018ruvchi/ })).toContainText('gross-profit-v1');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(evidenceButton).toBeFocused();

  await page.locator('#simulation-product-search').fill('Green Tea');
  await page.locator('#simulation-product-search').locator('xpath=ancestor::form').getByRole('button').click();
  await page.locator('section:has(#sg-simulator)').getByRole('button', { name: /Tanlash Green Tea 100g/ }).click();
  await page.locator('section:has(#sg-simulator)').getByRole('button', { name: /Simulyatsiyani ishga tushirish/ }).click();
  await expect(page.locator('[data-result="reorder-simulation"]')).toContainText('9 PCS');
  await page.locator('section:has(#sg-simulator) select').last().selectOption('31');
  await page.locator('section:has(#sg-simulator)').getByRole('button', { name: /proposal yaratish/ }).click();
  await expect(page.locator('[data-result="proposal-review"]')).toContainText('Demo Supplier');
  expect(bridgeBodies).toEqual([{ supplierId: 31 }]);

  await page.getByRole('button', { name: /Proposalni tasdiqlash/ }).click();
  const decisionDialog = page.getByRole('dialog', { name: /Proposalni tasdiqlash/ });
  await expect(decisionDialog).toContainText('PurchaseOrder DRAFT');
  await decisionDialog.getByRole('button', { name: 'Tasdiqlash', exact: true }).click();
  expect(decisionBodies[0].kind).toBe('approve');
  expect(Object.keys(decisionBodies[0].body).sort()).toEqual(['idempotencyKey', 'reason']);
  await expect(page.locator('section:has(#sg-ledger)')).toContainText('PROPOSAL_APPROVED');
  await expect(page.locator('section:has(#sg-ledger)')).toContainText('DRAFT_PURCHASE_ORDER_CREATED');
  expect([...new Set(ledger.map((event) => event.purchaseOrderId).filter(Boolean))]).toEqual([1001]);

  await page.locator('section:has(#sg-simulator)').getByRole('button', { name: /Simulyatsiyani ishga tushirish/ }).click();
  await expect(page.locator('[data-result="reorder-simulation"]')).toContainText('9 PCS');
  await page.locator('section:has(#sg-simulator) select').last().selectOption('31');
  await page.locator('section:has(#sg-simulator)').getByRole('button', { name: /proposal yaratish/ }).click();
  expect(bridgeBodies[1]).toEqual({ supplierId: 31 });
  await page.getByRole('button', { name: /Proposalni rad etish/ }).click();
  const rejectionDialog = page.getByRole('dialog', { name: /Proposalni rad etish/ });
  await expect(rejectionDialog).toContainText('PurchaseOrder DRAFT');
  await rejectionDialog.getByRole('button', { name: 'Rad etish', exact: true }).click();
  expect(decisionBodies[1].kind).toBe('reject');
  expect(Object.keys(decisionBodies[1].body).sort()).toEqual(['idempotencyKey', 'reason']);
  await expect(page.locator('section:has(#sg-ledger)')).toContainText('PROPOSAL_REJECTED');
  expect([...new Set(ledger.map((event) => event.purchaseOrderId).filter(Boolean))]).toEqual([1001]);

  await page.getByRole('button', { name: 'RU', exact: true }).click();
  await expect(page.locator('#sg-simulator')).toHaveText('\u0421\u0438\u043c\u0443\u043b\u044f\u0442\u043e\u0440 \u043f\u043e\u0432\u0442\u043e\u0440\u043d\u043e\u0433\u043e \u0437\u0430\u043a\u0430\u0437\u0430');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.locator('#sg-simulator')).toHaveText('Reorder Simulator');

  if (viewport.width > 720) {
    await page.getByRole('button', { name: /Menyuni yig'ish/ }).click();
    await expect(page.getByRole('button', { name: /Menyuni kengaytirish/ })).toBeVisible();
  } else {
    await expect(page.getByRole('button', { name: 'Menyu' })).toBeVisible();
    await expect.poll(
      () => page.locator('.sidebar').evaluate((element) => element.getBoundingClientRect().right),
    ).toBeLessThanOrEqual(1);
  }

  await expect(page.getByTestId('savdograph-workspace')).toBeVisible();
  await expect(page.getByRole('note')).toBeVisible();
  const overflow = await page.evaluate(() => ({
    page: {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
    },
    topbarChildren: [...document.querySelector('.topbar').children].map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName,
        className: element.className,
        left: rect.left,
        right: rect.right,
        width: rect.width,
      };
    }),
    offenders: [...document.querySelectorAll('body *')]
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.right > document.documentElement.clientWidth + 1)
      .slice(0, 8)
      .map(({ element, rect }) => ({
        tag: element.tagName, className: element.className, left: rect.left, right: rect.right, width: rect.width,
      })),
  }));
  const journeyGeometry = {
    viewport,
    ...overflow.page,
    consoleErrorCount: consoleErrors.length,
    pageErrorCount: pageErrors.length,
  };
  console.log('JOURNEY_GEOMETRY ' + JSON.stringify(journeyGeometry));
  expect(overflow.page.clientWidth).toBe(viewport.width);
  expect(
    overflow.page.scrollWidth,
    `${viewport.width}x${viewport.height}: ${JSON.stringify(overflow)}`,
  ).toBeLessThanOrEqual(overflow.page.clientWidth + 1);
  expect(overflow.page.bodyScrollWidth).toBeLessThanOrEqual(overflow.page.bodyClientWidth + 1);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);

  if (!captureScreenshots) return overflow;

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);

  // The four serial journey gates passed before this capture-only run starts.
  // Prepare one final pending proposal, then capture the approved evidence.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('section:has(#sg-simulator)').getByRole('button', { name: 'Run simulation', exact: true }).click();
  await expect(page.locator('[data-result="reorder-simulation"]')).toContainText('9 PCS');
  await page.locator('section:has(#sg-simulator) select').last().selectOption('31');
  await page.locator('section:has(#sg-simulator)').getByRole('button', { name: /Create proposal for review/ }).click();
  await expect(page.locator('[data-result="proposal-review"]')).toContainText('Demo Supplier');
  await expect(page.getByRole('button', { name: 'Approve proposal', exact: true })).toBeVisible();
  expect(bridgeBodies[2]).toEqual({ supplierId: 31 });
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);

  const screenshotPath = (name) => path.resolve(process.cwd(), '../docs/build-week/screenshots/b5.1', name);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: screenshotPath('01-owner-workspace-1440x900.png') });
  await page.locator('section:has(#sg-brief)').screenshot({ path: screenshotPath('02-gross-profit-brief.png') });

  const englishEvidenceButton = page.locator('[data-result="ask-store"]').getByRole('button', { name: /Open evidence 101/ }).first();
  await englishEvidenceButton.click();
  await expect(page.getByRole('dialog', { name: /Evidence Viewer/ })).toBeVisible();
  await page.screenshot({ path: screenshotPath('03-ask-store-with-evidence.png') });
  await page.keyboard.press('Escape');
  await expect(englishEvidenceButton).toBeFocused();

  await page.locator('section:has(#sg-simulator)').screenshot({ path: screenshotPath('04-reorder-simulation.png') });
  await page.locator('section:has(#sg-proposal)').screenshot({ path: screenshotPath('05-pending-proposal.png') });
  await page.getByRole('button', { name: 'Approve proposal', exact: true }).click();
  const approvalCaptureDialog = page.getByRole('dialog', { name: /Approve proposal/ });
  await expect(approvalCaptureDialog).toContainText('PurchaseOrder DRAFT');
  await page.screenshot({ path: screenshotPath('06-approval-confirmation.png') });
  await page.keyboard.press('Escape');
  await expect(approvalCaptureDialog).toBeHidden();

  await page.locator('section:has(#sg-ledger)').screenshot({ path: screenshotPath('07-action-ledger.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('savdograph-workspace')).toBeVisible();
  await expect.poll(
    () => page.locator('.sidebar').evaluate((element) => element.getBoundingClientRect().right),
  ).toBeLessThanOrEqual(1);
  const mobileCaptureGeometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  console.log('SCREENSHOT_GEOMETRY ' + JSON.stringify(mobileCaptureGeometry));
  expect(mobileCaptureGeometry.scrollWidth).toBeLessThanOrEqual(mobileCaptureGeometry.clientWidth + 1);
  expect(mobileCaptureGeometry.bodyScrollWidth).toBeLessThanOrEqual(mobileCaptureGeometry.clientWidth + 1);
  await page.screenshot({ path: screenshotPath('08-mobile-workspace-390x844.png'), fullPage: true });
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  return overflow;
}

test.describe.serial('complete mocked SavdoGraph release journey', () => {
  for (const viewport of JOURNEY_VIEWPORTS) {
    test(`passes all decision checks at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await runDecisionJourney(page, viewport);
    });
  }

  test('captures approved evidence only after all viewport journeys pass', async ({ page }) => {
    await runDecisionJourney(page, JOURNEY_VIEWPORTS[0], true);
  });
});

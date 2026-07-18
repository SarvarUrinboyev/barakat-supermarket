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

test('owner completes the mocked SavdoGraph decision journey at desktop and mobile widths', async ({ page }) => {
  let bridgeBody = null;
  let decisionBody = null;
  let ledger = [];

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
      return json({
        analysisRunId: 601,
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
    if (path === '/api/savdograph/reorder-simulations/601/proposals' && method === 'POST') {
      bridgeBody = request.postDataJSON();
      return json({
        proposalId: 701,
        proposalStatus: 'PENDING',
        sourceKind: 'REORDER_SIMULATION',
        sourceAnalysisRunId: 601,
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
      decisionBody = request.postDataJSON();
      ledger = [{
        id: 801,
        proposalId: 701,
        proposalDecisionId: 901,
        actor: 'Demo Owner',
        evidenceReferences: '[101]',
        eventType: 'PROPOSAL_APPROVED',
        outcome: 'PURCHASE_ORDER_DRAFT_CREATED',
        purchaseOrderId: 1001,
        details: 'Human approval recorded.',
        createdAt: '2026-07-18T12:04:00',
      }];
      return json({ proposalId: 701, decision: 'APPROVE', proposalStatus: 'APPROVED', purchaseOrderId: 1001, idempotent: false, decidedAt: '2026-07-18T12:04:00' });
    }
    return json(method === 'GET' ? [] : {});
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/savdograph');
  await expect(page.getByTestId('savdograph-workspace')).toBeVisible();
  await expect(page.locator('a[href="/savdograph"]')).toBeVisible();

  await page.locator('section:has(#sg-brief)').getByRole('button', { name: /Brief yaratish/ }).click();
  await expect(page.locator('[data-result="gross-profit-brief"]')).toContainText('1250000.0000 UZS');

  await page.locator('section:has(#sg-ask)').getByRole('button', { name: /Bugungi yalpi foyda/ }).click();
  await page.locator('section:has(#sg-ask)').getByRole('button', { name: 'So\u2018rash', exact: true }).click();
  await expect(page.locator('[data-result="ask-store"]')).toContainText('Bugungi yalpi foyda');
  await page.locator('[data-result="ask-store"]').getByRole('button', { name: /Dalilni ochish 101/ }).first().click();
  await expect(page.getByRole('dialog', { name: /Dalil ko\u2018ruvchi/ })).toContainText('gross-profit-v1');
  await page.getByRole('dialog').getByRole('button', { name: 'Yopish' }).click();

  await page.locator('#simulation-product-search').fill('Green Tea');
  await page.locator('#simulation-product-search').locator('xpath=ancestor::form').getByRole('button').click();
  await page.locator('section:has(#sg-simulator)').getByRole('button', { name: /Tanlash Green Tea 100g/ }).click();
  await page.locator('section:has(#sg-simulator)').getByRole('button', { name: /Simulyatsiyani ishga tushirish/ }).click();
  await expect(page.locator('[data-result="reorder-simulation"]')).toContainText('9 PCS');
  await page.locator('section:has(#sg-simulator) select').last().selectOption('31');
  await page.locator('section:has(#sg-simulator)').getByRole('button', { name: /proposal yaratish/ }).click();
  await expect(page.locator('[data-result="proposal-review"]')).toContainText('Demo Supplier');
  expect(bridgeBody).toEqual({ supplierId: 31 });

  await page.getByRole('button', { name: /Proposalni tasdiqlash/ }).click();
  const decisionDialog = page.getByRole('dialog', { name: /Proposalni tasdiqlash/ });
  await expect(decisionDialog).toContainText('PurchaseOrder DRAFT');
  await decisionDialog.getByRole('button', { name: 'Tasdiqlash', exact: true }).click();
  expect(Object.keys(decisionBody).sort()).toEqual(['idempotencyKey', 'reason']);
  await expect(page.locator('section:has(#sg-ledger)')).toContainText('PROPOSAL_APPROVED');
  await expect(page.locator('section:has(#sg-ledger)')).toContainText('PurchaseOrder DRAFT');

  await page.getByRole('button', { name: 'RU', exact: true }).click();
  await expect(page.locator('#sg-simulator')).toHaveText('\u0421\u0438\u043c\u0443\u043b\u044f\u0442\u043e\u0440 \u043f\u043e\u0432\u0442\u043e\u0440\u043d\u043e\u0433\u043e \u0437\u0430\u043a\u0430\u0437\u0430');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.locator('#sg-simulator')).toHaveText('Reorder Simulator');

  for (const viewport of [{ width: 1024, height: 900 }, { width: 768, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect(page.getByTestId('savdograph-workspace')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
  }
});

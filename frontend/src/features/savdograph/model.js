export const SAVDOGRAPH_PERMISSIONS = Object.freeze({
  read: 'SAVDOGRAPH:READ',
  write: 'SAVDOGRAPH:WRITE',
  decide: 'SAVDOGRAPH:DECIDE',
  ledger: 'SAVDOGRAPH_LEDGER:READ',
});

export const WORKSPACE_LOCALES = Object.freeze(['UZ', 'RU', 'EN']);
export const ASK_LOCALES = Object.freeze(['AUTO', ...WORKSPACE_LOCALES]);
export const MAX_PRODUCT_RESULTS = 8;

const TEXT = {
  UZ: {
    productPromise: "Mahalla savdosi uchun dalillarga asoslangan qarorlar.",
    safeEnvironment: 'Xavfsiz qaror muhiti', demoData: 'Demo ma\u2019lumotlar',
    demoNotice: "Bu muhit anonim namuna ma\u2019lumotlarini saqlaydi va production tizimiga yozmaydi.",
    timezone: 'Vaqt mintaqasi', selectedPeriod: 'Tanlangan davr', freshness: 'Yangilangan vaqt',
    notGenerated: 'Hali yaratilmagan', notAvailable: 'Mavjud emas', insufficientEvidence: 'Dalil yetarli emas',
    unsupportedCalculation: 'Hisoblash qo\u2018llab-quvvatlanmaydi', loading: 'Yuklanmoqda\u2026',
    retry: 'Qayta urinish', refresh: 'Yangilash', close: 'Yopish', cancel: 'Bekor qilish',
    grossProfitBrief: 'Daily Gross Profit Brief', briefHint: 'Yalpi foydaning deterministik, dalillangan ko\u2018rinishi.',
    periodStart: 'Boshlanish sanasi', periodEnd: 'Tugash sanasi (kiritilmaydi)', generateBrief: 'Brief yaratish',
    revenue: 'Tushum', cogs: 'Sotilgan tovar tannarxi (COGS)', grossProfit: 'Yalpi foyda',
    grossMargin: 'Yalpi marja', completedSales: 'Yakunlangan savdolar', refundedAmount: 'Qaytarilgan summa',
    sourceRecords: 'Manba yozuvlari', calculation: 'Hisoblash', generatedAt: 'Yaratilgan vaqt',
    evidence: 'Dalil', evidencePlural: 'O\u2018zgarmas dalillar', openEvidence: 'Dalilni ochish',
    noBrief: 'Tanlangan davr uchun brief yarating.',
    askStore: 'Do\u2018koningizdan so\u2018rang', askHint: 'Javoblar faqat ruxsat etilgan do\u2018kon vositalari va o\u2018zgarmas dalillarga tayangan.',
    question: 'Savol', answerLocale: 'Javob tili', ask: 'So\u2018rash', examples: 'Namuna savollar',
    uzExample: 'Bugungi yalpi foyda qancha va bu raqam qaysi dalillarga asoslangan?',
    ruExample: '\u0421\u043c\u043e\u0434\u0435\u043b\u0438\u0440\u0443\u0439 \u0437\u0430\u043f\u0430\u0441 \u044d\u0442\u043e\u0433\u043e \u0442\u043e\u0432\u0430\u0440\u0430 \u043d\u0430 \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0435 7 \u0434\u043d\u0435\u0439.',
    enExample: 'What information do you need before recommending a reorder?',
    noAnswer: 'Savol yuborilgandan keyin tuzilgan javob shu yerda ko\u2018rinadi.', facts: 'Faktlar',
    assumptions: 'Farazlar', risks: 'Xatarlar', limitations: 'Cheklovlar', toolsUsed: 'Ishlatilgan vositalar',
    suggestedActions: 'Keyingi tavsiya etilgan qadamlar', interaction: 'Muloqot', language: 'Til',
    selectProductToClarify: 'Aniqlashtirish uchun mahsulotni aniq tanlang.',
    productSearch: 'Mahsulot qidirish', search: 'Qidirish', searchPlaceholder: 'Nomi, SKU yoki shtrix-kod',
    noProducts: 'Mos mahsulot topilmadi.', select: 'Tanlash', selected: 'Tanlandi',
    reorderSimulator: 'Qayta buyurtma simulyatori', simulatorHint: 'Backend hisoblagan deterministik ssenariy. Simulyatsiya proposal yaratmaydi.',
    scenarioAssumption: 'Ssenariy farazi', lookbackDays: 'Tahlil davri (kun)', forecastDays: 'Prognoz ufqi (kun)',
    leadTimeDays: 'Yetkazish vaqti (kun)', safetyStockDays: 'Xavfsizlik zaxirasi (kun)', runSimulation: 'Simulyatsiyani ishga tushirish',
    currentStock: 'Joriy zaxira', netUnitsSold: 'Sof sotilgan birlik', velocity: 'Kunlik tezlik',
    coverageBefore: 'Buyurtmadan oldingi qamrov', coverageAfter: 'Buyurtmadan keyingi qamrov',
    reorderQuantity: 'Qayta buyurtma miqdori', stockoutRisk: 'Zaxira tugash xatari', overstockRisk: 'Ortiqcha zaxira xatari',
    tiedUpCapital: 'Bog\u2018langan kapital', analysisRun: 'Tahlil runi', noSimulation: 'Mahsulotni tanlang va ssenariyni ishga tushiring.',
    proposalReview: 'Proposal ko\u2018rib chiqish', proposalHint: 'Simulyatsiyadan inson qarorigacha bo\u2018lgan nazoratli yo\u2018l.',
    supplier: 'Yetkazib beruvchi', chooseSupplier: 'Yetkazib beruvchini tanlang', createProposal: 'Ko\u2018rib chiqish uchun proposal yaratish',
    proposalId: 'Proposal ID', proposalStatus: 'Holat', product: 'Mahsulot', quantity: 'Miqdor', sourceRun: 'Manba tahlili',
    idempotentReplay: 'Oldingi bir xil proposal xavfsiz qaytarildi.', noProposal: 'Avval mos simulyatsiyadan proposal yarating.',
    approve: 'Tasdiqlash', reject: 'Rad etish', approveProposal: 'Proposalni tasdiqlash', rejectProposal: 'Proposalni rad etish',
    optionalReason: 'Ixtiyoriy sabab', confirmDecision: 'Inson qarorini tasdiqlash',
    decisionWarning: 'Bu inson qarori. Tasdiq ko\u2018pi bilan bitta PurchaseOrder DRAFT yaratadi. U buyurtma bermaydi, to\u2018lamaydi, qabul qilmaydi, yetkazmaydi va yetkazib beruvchiga xabar bermaydi.',
    submitting: 'Yuborilmoqda\u2026', decisionConfirmed: 'Qaror backend tomonidan tasdiqlandi.',
    evidenceViewer: 'Dalil ko\u2018ruvchi', evidenceId: 'Dalil ID', evidenceType: 'Hisoblash turi', sourcePeriod: 'Manba davri',
    result: 'Natija', unitCurrency: 'Birlik / valyuta', integrityRecorded: 'O\u2018zgarmas hash yozilgan', structuredInputs: 'Tuzilgan kirishlar',
    actionLedger: 'Action Ledger', recordedHistory: 'Qayd etilgan qarorlar tarixi', ledgerHint: 'O\u2018zgarmas, faqat o\u2018qiladigan hodisalar.',
    timestamp: 'Vaqt', eventType: 'Hodisa', outcome: 'Natija', actor: 'Bajargan', proposalReference: 'Proposal',
    draftReference: 'PurchaseOrder DRAFT', noLedger: 'Hali qaror hodisasi qayd etilmagan.',
    deniedTitle: 'SavdoGraph uchun ruxsat yo\u2018q', deniedBody: 'Bu ish maydonini ko\u2018rish uchun SAVDOGRAPH:READ ruxsati kerak.',
    chooseStoreTitle: 'Bitta do\u2018konni tanlang', chooseStoreBody: 'SavdoGraph yozuvlari uchun yuqoridagi do\u2018kon almashtirgichida aniq do\u2018kon tanlanishi kerak.',
    validationPeriod: 'Davr 1 kundan 31 kungacha bo\u2018lishi va tugash sanasi boshlanishdan keyin kelishi kerak.',
    validationQuestion: 'Savol kiriting (ko\u2018pi bilan 1200 belgi).', validationProduct: 'Avval mahsulotni aniq tanlang.',
    validationSupplier: 'Yetkazib beruvchini tanlang.', validationBounds: 'Ssenariy qiymatlari backend chegaralariga mos emas.',
    malformedResponse: 'Server kutilgan tuzilgan javobni qaytarmadi.', backendUnavailable: 'Backend bilan aloqa o\u2018rnatilmadi.',
    permissionDenied: 'Bu amal uchun ruxsat yo\u2018q.', notFound: 'Yozuv topilmadi yoki boshqa do\u2018konga tegishli.',
    conflict: 'Holat o\u2018zgargan yoki tanlangan yetkazib beruvchi oldingi proposalga zid.',
    rateLimited: 'So\u2018rovlar chegarasi oshdi. Birozdan so\u2018ng qayta urinib ko\u2018ring.',
    providerUnavailable: 'AI provayder hozir mavjud emas. Hech qanday javob to\u2018qib chiqarilmadi.',
    refused: 'So\u2018rov xavfsizlik yoki domen chegarasi sabab rad etildi.',
    groundednessFailure: 'Javob dalillar bilan yetarlicha bog\u2018lanmadi va ko\u2018rsatilmayapti.',
    needsClarification: 'Javob berishdan oldin aniqlik kerak.', answered: 'Javob berildi', error: 'Xatolik',
    estimatedDescription: 'Backend farazlari asosidagi taxminiy natija.', verifiedDescription: 'O\u2018zgarmas manbalar bilan tekshirilgan natija.',
    insufficientDescription: 'Natija uchun dalil yoki kirishlar yetarli emas.', unsupportedDescription: 'So\u2018rov qo\u2018llab-quvvatlangan savdo doirasidan tashqarida.',
    verified: 'Tekshirilgan', estimated: 'Taxminiy', insufficientData: 'Ma\u2019lumot yetarli emas', unsupported: 'Qo\u2018llab-quvvatlanmaydi',
    pending: 'Kutilmoqda', approved: 'Tasdiqlangan', rejected: 'Rad etilgan',
  },
  RU: {
    productPromise: '\u0420\u0435\u0448\u0435\u043d\u0438\u044f \u0434\u043b\u044f \u0440\u043e\u0437\u043d\u0438\u0447\u043d\u043e\u0439 \u0442\u043e\u0440\u0433\u043e\u0432\u043b\u0438, \u043e\u0431\u043e\u0441\u043d\u043e\u0432\u0430\u043d\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u043c\u0438.',
    safeEnvironment: '\u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u0430\u044f \u0441\u0440\u0435\u0434\u0430 \u0440\u0435\u0448\u0435\u043d\u0438\u0439', demoData: '\u0414\u0435\u043c\u043e-\u0434\u0430\u043d\u043d\u044b\u0435',
    demoNotice: '\u042d\u0442\u0430 \u0441\u0440\u0435\u0434\u0430 \u0441\u043e\u0434\u0435\u0440\u0436\u0438\u0442 \u0430\u043d\u043e\u043d\u0438\u043c\u043d\u044b\u0435 \u043f\u0440\u0438\u043c\u0435\u0440\u044b \u0438 \u043d\u0435 \u0437\u0430\u043f\u0438\u0441\u044b\u0432\u0430\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0435 \u0432 production.',
    timezone: '\u0427\u0430\u0441\u043e\u0432\u043e\u0439 \u043f\u043e\u044f\u0441', selectedPeriod: '\u0412\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0439 \u043f\u0435\u0440\u0438\u043e\u0434', freshness: '\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e',
    notGenerated: '\u0415\u0449\u0451 \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u043d\u043e', notAvailable: '\u041d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e', insufficientEvidence: '\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u0434\u0430\u043d\u043d\u044b\u0445', unsupportedCalculation: '\u0420\u0430\u0441\u0447\u0451\u0442 \u043d\u0435 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044f',
    loading: '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026', retry: '\u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c', refresh: '\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c', close: '\u0417\u0430\u043a\u0440\u044b\u0442\u044c', cancel: '\u041e\u0442\u043c\u0435\u043d\u0430',
    grossProfitBrief: 'Daily Gross Profit Brief', briefHint: '\u0414\u0435\u0442\u0435\u0440\u043c\u0438\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0439 \u043e\u0442\u0447\u0451\u0442 \u043e \u0432\u0430\u043b\u043e\u0432\u043e\u0439 \u043f\u0440\u0438\u0431\u044b\u043b\u0438.',
    periodStart: '\u041d\u0430\u0447\u0430\u043b\u043e', periodEnd: '\u041a\u043e\u043d\u0435\u0446 (\u043d\u0435 \u0432\u043a\u043b\u044e\u0447\u0430\u044f)', generateBrief: '\u0421\u043e\u0437\u0434\u0430\u0442\u044c brief',
    revenue: '\u0412\u044b\u0440\u0443\u0447\u043a\u0430', cogs: '\u0421\u0435\u0431\u0435\u0441\u0442\u043e\u0438\u043c\u043e\u0441\u0442\u044c (COGS)', grossProfit: '\u0412\u0430\u043b\u043e\u0432\u0430\u044f \u043f\u0440\u0438\u0431\u044b\u043b\u044c', grossMargin: '\u0412\u0430\u043b\u043e\u0432\u0430\u044f \u043c\u0430\u0440\u0436\u0430',
    completedSales: '\u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043d\u043d\u044b\u0435 \u043f\u0440\u043e\u0434\u0430\u0436\u0438', refundedAmount: '\u0421\u0443\u043c\u043c\u0430 \u0432\u043e\u0437\u0432\u0440\u0430\u0442\u043e\u0432', sourceRecords: '\u0418\u0441\u0445\u043e\u0434\u043d\u044b\u0435 \u0437\u0430\u043f\u0438\u0441\u0438', calculation: '\u0420\u0430\u0441\u0447\u0451\u0442', generatedAt: '\u0421\u043e\u0437\u0434\u0430\u043d\u043e',
    evidence: '\u0414\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e', evidencePlural: '\u041d\u0435\u0438\u0437\u043c\u0435\u043d\u044f\u0435\u043c\u044b\u0435 \u0434\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0430', openEvidence: '\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0434\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e', noBrief: '\u0421\u043e\u0437\u0434\u0430\u0439\u0442\u0435 brief \u0434\u043b\u044f \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u0433\u043e \u043f\u0435\u0440\u0438\u043e\u0434\u0430.',
    askStore: '\u0421\u043f\u0440\u043e\u0441\u0438\u0442\u0435 \u0441\u0432\u043e\u0439 \u043c\u0430\u0433\u0430\u0437\u0438\u043d', askHint: '\u041e\u0442\u0432\u0435\u0442\u044b \u043e\u0441\u043d\u043e\u0432\u0430\u043d\u044b \u0442\u043e\u043b\u044c\u043a\u043e \u043d\u0430 \u0440\u0430\u0437\u0440\u0435\u0448\u0451\u043d\u043d\u044b\u0445 \u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u0430\u0445 \u0438 \u0434\u0430\u043d\u043d\u044b\u0445.',
    question: '\u0412\u043e\u043f\u0440\u043e\u0441', answerLocale: '\u042f\u0437\u044b\u043a \u043e\u0442\u0432\u0435\u0442\u0430', ask: '\u0421\u043f\u0440\u043e\u0441\u0438\u0442\u044c', examples: '\u041f\u0440\u0438\u043c\u0435\u0440\u044b',
    uzExample: 'Bugungi yalpi foyda qancha va bu raqam qaysi dalillarga asoslangan?', ruExample: '\u0421\u043c\u043e\u0434\u0435\u043b\u0438\u0440\u0443\u0439 \u0437\u0430\u043f\u0430\u0441 \u044d\u0442\u043e\u0433\u043e \u0442\u043e\u0432\u0430\u0440\u0430 \u043d\u0430 \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0435 7 \u0434\u043d\u0435\u0439.', enExample: 'What information do you need before recommending a reorder?',
    noAnswer: '\u0421\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0439 \u043e\u0442\u0432\u0435\u0442 \u043f\u043e\u044f\u0432\u0438\u0442\u0441\u044f \u0437\u0434\u0435\u0441\u044c.', facts: '\u0424\u0430\u043a\u0442\u044b', assumptions: '\u0414\u043e\u043f\u0443\u0449\u0435\u043d\u0438\u044f', risks: '\u0420\u0438\u0441\u043a\u0438', limitations: '\u041e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u0438\u044f', toolsUsed: '\u0418\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u043d\u043d\u044b\u0435 \u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b', suggestedActions: '\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0435 \u0448\u0430\u0433\u0438', interaction: '\u0414\u0438\u0430\u043b\u043e\u0433', language: '\u042f\u0437\u044b\u043a',
    selectProductToClarify: '\u0414\u043b\u044f \u0443\u0442\u043e\u0447\u043d\u0435\u043d\u0438\u044f \u044f\u0432\u043d\u043e \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u043e\u0432\u0430\u0440.', productSearch: '\u041f\u043e\u0438\u0441\u043a \u0442\u043e\u0432\u0430\u0440\u0430', search: '\u041d\u0430\u0439\u0442\u0438', searchPlaceholder: '\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435, SKU \u0438\u043b\u0438 \u0448\u0442\u0440\u0438\u0445\u043a\u043e\u0434', noProducts: '\u0422\u043e\u0432\u0430\u0440\u044b \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b.', select: '\u0412\u044b\u0431\u0440\u0430\u0442\u044c', selected: '\u0412\u044b\u0431\u0440\u0430\u043d\u043e',
    reorderSimulator: '\u0421\u0438\u043c\u0443\u043b\u044f\u0442\u043e\u0440 \u043f\u043e\u0432\u0442\u043e\u0440\u043d\u043e\u0433\u043e \u0437\u0430\u043a\u0430\u0437\u0430', simulatorHint: '\u0414\u0435\u0442\u0435\u0440\u043c\u0438\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0439 \u0441\u0446\u0435\u043d\u0430\u0440\u0438\u0439 backend. \u0421\u0438\u043c\u0443\u043b\u044f\u0446\u0438\u044f \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u0451\u0442 proposal.',
    scenarioAssumption: '\u0414\u043e\u043f\u0443\u0449\u0435\u043d\u0438\u0435 \u0441\u0446\u0435\u043d\u0430\u0440\u0438\u044f', lookbackDays: '\u041e\u043a\u043d\u043e \u0430\u043d\u0430\u043b\u0438\u0437\u0430 (\u0434\u043d\u0438)', forecastDays: '\u0413\u043e\u0440\u0438\u0437\u043e\u043d\u0442 \u043f\u0440\u043e\u0433\u043d\u043e\u0437\u0430 (\u0434\u043d\u0438)', leadTimeDays: '\u0421\u0440\u043e\u043a \u043f\u043e\u0441\u0442\u0430\u0432\u043a\u0438 (\u0434\u043d\u0438)', safetyStockDays: '\u0421\u0442\u0440\u0430\u0445\u043e\u0432\u043e\u0439 \u0437\u0430\u043f\u0430\u0441 (\u0434\u043d\u0438)', runSimulation: '\u0417\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c \u0441\u0438\u043c\u0443\u043b\u044f\u0446\u0438\u044e',
    currentStock: '\u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u0437\u0430\u043f\u0430\u0441', netUnitsSold: '\u041f\u0440\u043e\u0434\u0430\u043d\u043e \u043d\u0435\u0442\u0442\u043e', velocity: '\u0421\u043a\u043e\u0440\u043e\u0441\u0442\u044c \u0432 \u0434\u0435\u043d\u044c', coverageBefore: '\u041f\u043e\u043a\u0440\u044b\u0442\u0438\u0435 \u0434\u043e \u0437\u0430\u043a\u0430\u0437\u0430', coverageAfter: '\u041f\u043e\u043a\u0440\u044b\u0442\u0438\u0435 \u043f\u043e\u0441\u043b\u0435 \u0437\u0430\u043a\u0430\u0437\u0430', reorderQuantity: '\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0434\u043e\u0437\u0430\u043a\u0430\u0437\u0430', stockoutRisk: '\u0420\u0438\u0441\u043a \u0434\u0435\u0444\u0438\u0446\u0438\u0442\u0430', overstockRisk: '\u0420\u0438\u0441\u043a \u0438\u0437\u0431\u044b\u0442\u043a\u0430', tiedUpCapital: '\u0421\u0432\u044f\u0437\u0430\u043d\u043d\u044b\u0439 \u043a\u0430\u043f\u0438\u0442\u0430\u043b', analysisRun: '\u0417\u0430\u043f\u0443\u0441\u043a \u0430\u043d\u0430\u043b\u0438\u0437\u0430', noSimulation: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u043e\u0432\u0430\u0440 \u0438 \u0437\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u0435 \u0441\u0446\u0435\u043d\u0430\u0440\u0438\u0439.',
    proposalReview: '\u0420\u0430\u0441\u0441\u043c\u043e\u0442\u0440\u0435\u043d\u0438\u0435 proposal', proposalHint: '\u041a\u043e\u043d\u0442\u0440\u043e\u043b\u0438\u0440\u0443\u0435\u043c\u044b\u0439 \u043f\u0443\u0442\u044c \u043e\u0442 \u0441\u0438\u043c\u0443\u043b\u044f\u0446\u0438\u0438 \u043a \u0440\u0435\u0448\u0435\u043d\u0438\u044e \u0447\u0435\u043b\u043e\u0432\u0435\u043a\u0430.', supplier: '\u041f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a', chooseSupplier: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0430', createProposal: '\u0421\u043e\u0437\u0434\u0430\u0442\u044c proposal \u0434\u043b\u044f \u0440\u0430\u0441\u0441\u043c\u043e\u0442\u0440\u0435\u043d\u0438\u044f',
    proposalId: 'Proposal ID', proposalStatus: '\u0421\u0442\u0430\u0442\u0443\u0441', product: '\u0422\u043e\u0432\u0430\u0440', quantity: '\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e', sourceRun: '\u0418\u0441\u0445\u043e\u0434\u043d\u044b\u0439 \u0430\u043d\u0430\u043b\u0438\u0437', idempotentReplay: '\u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e \u0432\u043e\u0437\u0432\u0440\u0430\u0449\u0451\u043d \u0440\u0430\u043d\u0435\u0435 \u0441\u043e\u0437\u0434\u0430\u043d\u043d\u044b\u0439 proposal.', noProposal: '\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0441\u043e\u0437\u0434\u0430\u0439\u0442\u0435 proposal \u0438\u0437 \u043f\u043e\u0434\u0445\u043e\u0434\u044f\u0449\u0435\u0439 \u0441\u0438\u043c\u0443\u043b\u044f\u0446\u0438\u0438.',
    approve: '\u0423\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c', reject: '\u041e\u0442\u043a\u043b\u043e\u043d\u0438\u0442\u044c', approveProposal: '\u0423\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c proposal', rejectProposal: '\u041e\u0442\u043a\u043b\u043e\u043d\u0438\u0442\u044c proposal', optionalReason: '\u041d\u0435\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u043f\u0440\u0438\u0447\u0438\u043d\u0430', confirmDecision: '\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c \u0440\u0435\u0448\u0435\u043d\u0438\u0435 \u0447\u0435\u043b\u043e\u0432\u0435\u043a\u0430',
    decisionWarning: '\u042d\u0442\u043e \u0440\u0435\u0448\u0435\u043d\u0438\u0435 \u0447\u0435\u043b\u043e\u0432\u0435\u043a\u0430. \u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435 \u0441\u043e\u0437\u0434\u0430\u0451\u0442 \u043d\u0435 \u0431\u043e\u043b\u0435\u0435 \u043e\u0434\u043d\u043e\u0433\u043e PurchaseOrder DRAFT. \u041e\u043d\u043e \u043d\u0435 \u0437\u0430\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442, \u043d\u0435 \u043e\u043f\u043b\u0430\u0447\u0438\u0432\u0430\u0435\u0442, \u043d\u0435 \u043f\u0440\u0438\u043d\u0438\u043c\u0430\u0435\u0442, \u043d\u0435 \u0434\u043e\u0441\u0442\u0430\u0432\u043b\u044f\u0435\u0442 \u0438 \u043d\u0435 \u0443\u0432\u0435\u0434\u043e\u043c\u043b\u044f\u0435\u0442 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0430.', submitting: '\u041e\u0442\u043f\u0440\u0430\u0432\u043a\u0430\u2026', decisionConfirmed: '\u0420\u0435\u0448\u0435\u043d\u0438\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e backend.',
    evidenceViewer: '\u041f\u0440\u043e\u0441\u043c\u043e\u0442\u0440 \u0434\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432', evidenceId: 'ID \u0434\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0430', evidenceType: '\u0422\u0438\u043f \u0440\u0430\u0441\u0447\u0451\u0442\u0430', sourcePeriod: '\u041f\u0435\u0440\u0438\u043e\u0434 \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0430', result: '\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442', unitCurrency: '\u0415\u0434\u0438\u043d\u0438\u0446\u0430 / \u0432\u0430\u043b\u044e\u0442\u0430', integrityRecorded: '\u041d\u0435\u0438\u0437\u043c\u0435\u043d\u044f\u0435\u043c\u044b\u0439 hash \u0437\u0430\u043f\u0438\u0441\u0430\u043d', structuredInputs: '\u0421\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0435 \u0432\u0445\u043e\u0434\u044b',
    actionLedger: 'Action Ledger', recordedHistory: '\u0417\u0430\u043f\u0438\u0441\u0430\u043d\u043d\u0430\u044f \u0438\u0441\u0442\u043e\u0440\u0438\u044f \u0440\u0435\u0448\u0435\u043d\u0438\u0439', ledgerHint: '\u041d\u0435\u0438\u0437\u043c\u0435\u043d\u044f\u0435\u043c\u044b\u0435 \u0441\u043e\u0431\u044b\u0442\u0438\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u0434\u043b\u044f \u0447\u0442\u0435\u043d\u0438\u044f.', timestamp: '\u0412\u0440\u0435\u043c\u044f', eventType: '\u0421\u043e\u0431\u044b\u0442\u0438\u0435', outcome: '\u0418\u0441\u0445\u043e\u0434', actor: '\u0410\u043a\u0442\u043e\u0440', proposalReference: 'Proposal', draftReference: 'PurchaseOrder DRAFT', noLedger: '\u0421\u043e\u0431\u044b\u0442\u0438\u044f \u0440\u0435\u0448\u0435\u043d\u0438\u0439 \u0435\u0449\u0451 \u043d\u0435 \u0437\u0430\u043f\u0438\u0441\u0430\u043d\u044b.',
    deniedTitle: '\u041d\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u043a SavdoGraph', deniedBody: '\u0414\u043b\u044f \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0430 \u043d\u0443\u0436\u043d\u043e \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u0435 SAVDOGRAPH:READ.', chooseStoreTitle: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043e\u0434\u0438\u043d \u043c\u0430\u0433\u0430\u0437\u0438\u043d', chooseStoreBody: '\u0414\u043b\u044f SavdoGraph \u043d\u0443\u0436\u043d\u043e \u0432\u044b\u0431\u0440\u0430\u0442\u044c \u043a\u043e\u043d\u043a\u0440\u0435\u0442\u043d\u044b\u0439 \u043c\u0430\u0433\u0430\u0437\u0438\u043d.',
    validationPeriod: '\u041f\u0435\u0440\u0438\u043e\u0434 \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u043e\u0442 1 \u0434\u043e 31 \u0434\u043d\u044f.', validationQuestion: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0432\u043e\u043f\u0440\u043e\u0441 (\u0434\u043e 1200 \u0437\u043d\u0430\u043a\u043e\u0432).', validationProduct: '\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u044f\u0432\u043d\u043e \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u043e\u0432\u0430\u0440.', validationSupplier: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0430.', validationBounds: '\u0417\u043d\u0430\u0447\u0435\u043d\u0438\u044f \u0432\u043d\u0435 \u0433\u0440\u0430\u043d\u0438\u0446 backend.',
    malformedResponse: '\u0421\u0435\u0440\u0432\u0435\u0440 \u0432\u0435\u0440\u043d\u0443\u043b \u043d\u0435\u043e\u0436\u0438\u0434\u0430\u043d\u043d\u044b\u0439 \u043e\u0442\u0432\u0435\u0442.', backendUnavailable: '\u041d\u0435\u0442 \u0441\u0432\u044f\u0437\u0438 \u0441 backend.', permissionDenied: '\u041d\u0435\u0442 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u044f.', notFound: '\u0417\u0430\u043f\u0438\u0441\u044c \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430 \u0438\u043b\u0438 \u043e\u0442\u043d\u043e\u0441\u0438\u0442\u0441\u044f \u043a \u0434\u0440\u0443\u0433\u043e\u043c\u0443 \u043c\u0430\u0433\u0430\u0437\u0438\u043d\u0443.', conflict: '\u0421\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u0438\u0437\u043c\u0435\u043d\u0438\u043b\u043e\u0441\u044c \u0438\u043b\u0438 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a \u043a\u043e\u043d\u0444\u043b\u0438\u043a\u0442\u0443\u0435\u0442.', rateLimited: '\u041b\u0438\u043c\u0438\u0442 \u0437\u0430\u043f\u0440\u043e\u0441\u043e\u0432 \u043f\u0440\u0435\u0432\u044b\u0448\u0435\u043d.', providerUnavailable: 'AI-\u043f\u0440\u043e\u0432\u0430\u0439\u0434\u0435\u0440 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d. \u041e\u0442\u0432\u0435\u0442 \u043d\u0435 \u0432\u044b\u0434\u0443\u043c\u0430\u043d.', refused: '\u0417\u0430\u043f\u0440\u043e\u0441 \u043e\u0442\u043a\u043b\u043e\u043d\u0451\u043d \u043f\u043e \u0433\u0440\u0430\u043d\u0438\u0446\u0430\u043c \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438 \u0438\u043b\u0438 \u0434\u043e\u043c\u0435\u043d\u0430.', groundednessFailure: '\u041e\u0442\u0432\u0435\u0442 \u043d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d \u0434\u0430\u043d\u043d\u044b\u043c\u0438.', needsClarification: '\u041d\u0443\u0436\u043d\u043e \u0443\u0442\u043e\u0447\u043d\u0435\u043d\u0438\u0435.', answered: '\u041e\u0442\u0432\u0435\u0442 \u0433\u043e\u0442\u043e\u0432', error: '\u041e\u0448\u0438\u0431\u043a\u0430',
    estimatedDescription: '\u041e\u0446\u0435\u043d\u043e\u0447\u043d\u044b\u0439 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043d\u0430 \u0434\u043e\u043f\u0443\u0449\u0435\u043d\u0438\u044f\u0445 backend.', verifiedDescription: '\u041f\u0440\u043e\u0432\u0435\u0440\u0435\u043d\u043e \u043f\u043e \u043d\u0435\u0438\u0437\u043c\u0435\u043d\u044f\u0435\u043c\u044b\u043c \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0430\u043c.', insufficientDescription: '\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u0434\u0430\u043d\u043d\u044b\u0445 \u0438\u043b\u0438 \u0432\u0445\u043e\u0434\u043e\u0432.', unsupportedDescription: '\u0417\u0430\u043f\u0440\u043e\u0441 \u0432\u043d\u0435 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043c\u043e\u0433\u043e \u0442\u043e\u0440\u0433\u043e\u0432\u043e\u0433\u043e \u0434\u043e\u043c\u0435\u043d\u0430.', verified: '\u041f\u0440\u043e\u0432\u0435\u0440\u0435\u043d\u043e', estimated: '\u041e\u0446\u0435\u043d\u043a\u0430', insufficientData: '\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u0434\u0430\u043d\u043d\u044b\u0445', unsupported: '\u041d\u0435 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044f', pending: '\u041e\u0436\u0438\u0434\u0430\u0435\u0442', approved: '\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e', rejected: '\u041e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u043e',
  },
  EN: {
    productPromise: 'Evidence-backed decisions for neighborhood retail.', safeEnvironment: 'Safe decision environment', demoData: 'Demo Data',
    demoNotice: 'This environment contains anonymized sample data and does not write to production.', timezone: 'Timezone', selectedPeriod: 'Selected period', freshness: 'Data freshness',
    notGenerated: 'Not generated yet', notAvailable: 'Not available', insufficientEvidence: 'Insufficient evidence', unsupportedCalculation: 'Unsupported calculation',
    loading: 'Loading\u2026', retry: 'Retry', refresh: 'Refresh', close: 'Close', cancel: 'Cancel', grossProfitBrief: 'Daily Gross Profit Brief',
    briefHint: 'A deterministic, evidence-backed view of gross profit.', periodStart: 'Start date', periodEnd: 'End date (exclusive)', generateBrief: 'Generate brief',
    revenue: 'Revenue', cogs: 'Cost of goods sold (COGS)', grossProfit: 'Gross Profit', grossMargin: 'Gross margin', completedSales: 'Completed sales', refundedAmount: 'Refunded amount', sourceRecords: 'Source records', calculation: 'Calculation', generatedAt: 'Generated at',
    evidence: 'Evidence', evidencePlural: 'Immutable evidence', openEvidence: 'Open evidence', noBrief: 'Generate a brief for the selected period.',
    askStore: 'Ask Your Store', askHint: 'Answers use only authorized store tools and immutable evidence.', question: 'Question', answerLocale: 'Answer language', ask: 'Ask', examples: 'Example questions',
    uzExample: 'Bugungi yalpi foyda qancha va bu raqam qaysi dalillarga asoslangan?', ruExample: '\u0421\u043c\u043e\u0434\u0435\u043b\u0438\u0440\u0443\u0439 \u0437\u0430\u043f\u0430\u0441 \u044d\u0442\u043e\u0433\u043e \u0442\u043e\u0432\u0430\u0440\u0430 \u043d\u0430 \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0435 7 \u0434\u043d\u0435\u0439.', enExample: 'What information do you need before recommending a reorder?',
    noAnswer: 'The typed response will appear here after you ask a question.', facts: 'Facts', assumptions: 'Assumptions', risks: 'Risks', limitations: 'Limitations', toolsUsed: 'Tools used', suggestedActions: 'Suggested next actions', interaction: 'Interaction', language: 'Language',
    selectProductToClarify: 'Explicitly select the product needed for clarification.', productSearch: 'Product search', search: 'Search', searchPlaceholder: 'Name, SKU, or barcode', noProducts: 'No matching products found.', select: 'Select', selected: 'Selected',
    reorderSimulator: 'Reorder Simulator', simulatorHint: 'A deterministic scenario calculated by the backend. A simulation does not create a proposal.', scenarioAssumption: 'Scenario assumption',
    lookbackDays: 'Lookback (days)', forecastDays: 'Forecast horizon (days)', leadTimeDays: 'Lead time (days)', safetyStockDays: 'Safety stock (days)', runSimulation: 'Run simulation',
    currentStock: 'Current stock', netUnitsSold: 'Net units sold', velocity: 'Daily velocity', coverageBefore: 'Coverage before reorder', coverageAfter: 'Coverage after reorder', reorderQuantity: 'Reorder quantity', stockoutRisk: 'Stockout risk', overstockRisk: 'Overstock risk', tiedUpCapital: 'Tied-up capital', analysisRun: 'Analysis run', noSimulation: 'Select a product and run a scenario.',
    proposalReview: 'Proposal Review', proposalHint: 'A controlled path from simulation to a human decision.', supplier: 'Supplier', chooseSupplier: 'Choose a supplier', createProposal: 'Create proposal for review',
    proposalId: 'Proposal ID', proposalStatus: 'Status', product: 'Product', quantity: 'Quantity', sourceRun: 'Source analysis', idempotentReplay: 'The previously created identical proposal was safely returned.', noProposal: 'Create a proposal from an eligible simulation first.',
    approve: 'Approve', reject: 'Reject', approveProposal: 'Approve proposal', rejectProposal: 'Reject proposal', optionalReason: 'Optional reason', confirmDecision: 'Confirm human decision',
    decisionWarning: 'This is a human decision. Approval creates at most one PurchaseOrder DRAFT. It does not order, pay, receive, deliver, or notify the supplier.', submitting: 'Submitting\u2026', decisionConfirmed: 'The backend confirmed the decision.',
    evidenceViewer: 'Evidence Viewer', evidenceId: 'Evidence ID', evidenceType: 'Calculation type', sourcePeriod: 'Source period', result: 'Result', unitCurrency: 'Unit / currency', integrityRecorded: 'Immutable hash recorded', structuredInputs: 'Structured inputs',
    actionLedger: 'Action Ledger', recordedHistory: 'Recorded decision history', ledgerHint: 'Immutable, read-only events.', timestamp: 'Timestamp', eventType: 'Event type', outcome: 'Outcome', actor: 'Actor', proposalReference: 'Proposal', draftReference: 'PurchaseOrder DRAFT', noLedger: 'No decision event has been recorded yet.',
    deniedTitle: 'SavdoGraph access denied', deniedBody: 'SAVDOGRAPH:READ is required to view this workspace.', chooseStoreTitle: 'Select one store', chooseStoreBody: 'Select a specific store in the top switcher before using SavdoGraph writes.',
    validationPeriod: 'The period must be 1 to 31 days, with the exclusive end after the start.', validationQuestion: 'Enter a question of at most 1200 characters.', validationProduct: 'Explicitly select a product first.', validationSupplier: 'Select a supplier.', validationBounds: 'Scenario values are outside backend bounds.',
    malformedResponse: 'The server returned an unexpected structured response.', backendUnavailable: 'The backend could not be reached.', permissionDenied: 'You do not have permission for this action.', notFound: 'The record was not found or belongs to another store.', conflict: 'The state changed or this supplier conflicts with the existing proposal.', rateLimited: 'The request limit was reached. Try again shortly.',
    providerUnavailable: 'The AI provider is unavailable. No fallback answer was fabricated.', refused: 'The request was refused by a safety or domain boundary.', groundednessFailure: 'The answer was not sufficiently grounded and is not shown.', needsClarification: 'Clarification is required before answering.', answered: 'Answered', error: 'Error',
    estimatedDescription: 'An estimate based on backend-listed assumptions.', verifiedDescription: 'Verified against immutable source records.', insufficientDescription: 'Evidence or required inputs are insufficient.', unsupportedDescription: 'The request is outside the supported retail domain.',
    verified: 'Verified', estimated: 'Estimated', insufficientData: 'Insufficient data', unsupported: 'Unsupported', pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
  },
};

export function sgText(locale, key) {
  return TEXT[WORKSPACE_LOCALES.includes(locale) ? locale : 'UZ']?.[key]
    ?? TEXT.EN[key]
    ?? key;
}

export function normalisePermissions(value) {
  if (value instanceof Set) return new Set([...value].map((v) => String(v).trim().toUpperCase()).filter(Boolean));
  if (Array.isArray(value)) return new Set(value.map((v) => String(v).trim().toUpperCase()).filter(Boolean));
  return new Set(String(value ?? '').split(',').map((v) => v.trim().toUpperCase()).filter(Boolean));
}

export function hasPermission(user, permission) {
  const permissions = normalisePermissions(user?.permissions);
  return permissions.has('*:*') || permissions.has(String(permission).toUpperCase());
}

export const canReadSavdoGraph = (user) => hasPermission(user, SAVDOGRAPH_PERMISSIONS.read);
export const canWriteSavdoGraph = (user) => hasPermission(user, SAVDOGRAPH_PERMISSIONS.write);
export const canReadLedger = (user) => hasPermission(user, SAVDOGRAPH_PERMISSIONS.ledger);
export const canDecideSavdoGraph = (user) => user?.role === 'ACCOUNT_OWNER'
  && hasPermission(user, SAVDOGRAPH_PERMISSIONS.decide);

export function classificationMeta(classification, locale = 'UZ') {
  const value = String(classification || 'INSUFFICIENT_DATA').toUpperCase();
  const map = {
    VERIFIED: { icon: '\u2713', tone: 'verified', label: 'verified', description: 'verifiedDescription' },
    ESTIMATED: { icon: '~', tone: 'estimated', label: 'estimated', description: 'estimatedDescription' },
    INSUFFICIENT_DATA: { icon: '!', tone: 'insufficient', label: 'insufficientData', description: 'insufficientDescription' },
    UNSUPPORTED: { icon: '\u00d7', tone: 'unsupported', label: 'unsupported', description: 'unsupportedDescription' },
  };
  const item = map[value] || map.INSUFFICIENT_DATA;
  return { value, ...item, label: sgText(locale, item.label), description: sgText(locale, item.description) };
}

export function statusLabel(status, locale = 'UZ') {
  const labels = {
    ANSWERED: 'answered', NEEDS_CLARIFICATION: 'needsClarification', INSUFFICIENT_DATA: 'insufficientData',
    UNSUPPORTED: 'unsupported', PROVIDER_UNAVAILABLE: 'providerUnavailable', REFUSED: 'refused', ERROR: 'error',
    GROUNDEDNESS_VALIDATION_FAILED: 'groundednessFailure', PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected',
  };
  return sgText(locale, labels[String(status || '').toUpperCase()] || 'error');
}

export function displayBackendValue(value, locale = 'UZ') {
  return value === null || value === undefined || value === '' ? sgText(locale, 'notAvailable') : String(value);
}

export function validatePeriod(periodStart, periodEnd, maxDays = 31) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart || '') || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd || '')) return false;
  const start = Date.parse(`${periodStart}T00:00:00Z`);
  const end = Date.parse(`${periodEnd}T00:00:00Z`);
  const days = (end - start) / 86400000;
  return Number.isInteger(days) && days >= 1 && days <= maxDays;
}

export function validateSimulationInput(input) {
  const boundedInteger = (value, min, max) => Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max;
  return Number.isInteger(Number(input?.productId)) && Number(input.productId) > 0
    && validatePeriod(input?.lookbackStart, input?.lookbackEnd, 90)
    && boundedInteger(input?.leadTimeDays, 0, 60)
    && boundedInteger(input?.safetyStockDays, 0, 90)
    && boundedInteger(input?.forecastHorizonDays, 1, 180);
}

export function boundedProducts(products, max = MAX_PRODUCT_RESULTS) {
  return (Array.isArray(products) ? products : []).filter((item) => item && Number(item.id) > 0).slice(0, max);
}

export function evidenceIdList(value) {
  if (Array.isArray(value)) return value.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  if (value && typeof value === 'object') return Object.values(value).map(Number).filter((id) => Number.isInteger(id) && id > 0);
  return [];
}

export function isSimulationEligible(simulation) {
  return simulation?.classification === 'ESTIMATED'
    && Number.isInteger(Number(simulation?.reorderQuantity))
    && Number(simulation.reorderQuantity) > 0
    && Number.isInteger(Number(simulation?.analysisRunId))
    && Number(simulation.analysisRunId) > 0
    && evidenceIdList(simulation?.evidenceIds).length > 0;
}

export function buildBridgeRequest(supplierId) {
  const id = Number(supplierId);
  if (!Number.isInteger(id) || id <= 0) throw new TypeError('supplierId must be a positive integer');
  return { supplierId: id };
}

export function buildDecisionRequest(reason, idempotencyKey) {
  const key = String(idempotencyKey || '').trim();
  if (!key || key.length > 120) throw new TypeError('idempotencyKey must contain 1..120 characters');
  const cleanReason = String(reason || '').trim();
  if (cleanReason.length > 500) throw new TypeError('reason must contain at most 500 characters');
  return { reason: cleanReason || null, idempotencyKey: key };
}

export function createDecisionKey(proposalId, decision) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `sg-${proposalId}-${String(decision).toLowerCase()}-${random}`.slice(0, 120);
}

const SENSITIVE_KEY = /(tenant|shop.?id|account.?id|customer|employee|credential|secret|token|password|api.?key|provider.?payload|reasoning)/i;

export function safeStructuredInputs(input) {
  let value = input;
  if (typeof input === 'string') {
    try { value = JSON.parse(input); } catch { return null; }
  }
  const clean = (item, depth) => {
    if (depth > 4) return '[bounded]';
    if (Array.isArray(item)) return item.slice(0, 20).map((entry) => clean(entry, depth + 1));
    if (item && typeof item === 'object') {
      return Object.fromEntries(Object.entries(item)
        .filter(([key]) => !SENSITIVE_KEY.test(key))
        .slice(0, 30)
        .map(([key, entry]) => [key, clean(entry, depth + 1)]));
    }
    if (typeof item === 'string') return item.slice(0, 500);
    return item;
  };
  return value && typeof value === 'object' ? clean(value, 0) : null;
}

export function parseEvidenceReferences(value) {
  if (Array.isArray(value)) return evidenceIdList(value);
  if (typeof value !== 'string') return [];
  try { return evidenceIdList(JSON.parse(value)); } catch {
    return [...value.matchAll(/\b\d+\b/g)].map((match) => Number(match[0])).filter((id) => id > 0).slice(0, 20);
  }
}

export function safeErrorKey(error) {
  if (error?.status === 0) return 'backendUnavailable';
  if (error?.status === 401 || error?.status === 403) return 'permissionDenied';
  if (error?.status === 404) return 'notFound';
  if (error?.status === 409) return 'conflict';
  if (error?.status === 429) return 'rateLimited';
  return 'error';
}

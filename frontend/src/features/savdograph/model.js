import { toCyrillic } from '../../i18n/i18n.js';

export const SAVDOGRAPH_PERMISSIONS = Object.freeze({
  read: 'SAVDOGRAPH:READ',
  write: 'SAVDOGRAPH:WRITE',
  decide: 'SAVDOGRAPH:DECIDE',
  ledger: 'SAVDOGRAPH_LEDGER:READ',
});

export const WORKSPACE_LOCALES = Object.freeze(['UZ', 'UZC', 'RU', 'EN']);
export const ASK_LOCALES = Object.freeze(['AUTO', 'UZ', 'RU', 'EN']);

const WORKSPACE_LOCALE_BY_GLOBAL_LANGUAGE = Object.freeze({ uz: 'UZ', uzc: 'UZC', ru: 'RU', en: 'EN' });
const ASK_LOCALE_BY_GLOBAL_LANGUAGE = Object.freeze({ uz: 'UZ', uzc: 'UZ', ru: 'RU', en: 'EN' });
const INTL_LOCALE_BY_WORKSPACE = Object.freeze({ UZ: 'uz-UZ', UZC: 'uz-Cyrl-UZ', RU: 'ru-RU', EN: 'en-US' });
const SAVDOGRAPH_TIMEZONE = 'Asia/Tashkent';
export const MAX_PRODUCT_RESULTS = 8;

const ASK_CLASSIFICATIONS_BY_STATUS = Object.freeze({
  ANSWERED: new Set(['VERIFIED', 'ESTIMATED']),
  NEEDS_CLARIFICATION: new Set([null, 'INSUFFICIENT_DATA']),
  INSUFFICIENT_DATA: new Set(['INSUFFICIENT_DATA']),
  UNSUPPORTED: new Set(['UNSUPPORTED']),
  PROVIDER_UNAVAILABLE: new Set([null]),
  REFUSED: new Set([null]),
  ERROR: new Set([null]),
  GROUNDEDNESS_VALIDATION_FAILED: new Set([null]),
});

const ASK_RESPONSE_FIELDS = Object.freeze([
  'interactionId', 'model', 'promptVersion', 'status', 'errorCode', 'language',
  'answer', 'classification', 'facts', 'assumptions', 'limitations', 'toolsUsed',
  'evidenceIds', 'suggestedNextActions', 'providerLatencyMs', 'generatedAt',
]);

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

const EXPERIENCE_TEXT = {
  UZ: {
    productPromise: 'Chakana savdo qarorlari uchun dalilga asoslangan operatsion tizim.',
    productSupport: 'U taxmin qilmaydi. Isbotlaydi, simulyatsiya qiladi va inson tasdig‘ini kutadi.',
    judgeStart: '90 soniyalik yo‘naltirilgan demoni boshlash', judgeExit: 'Yo‘naltirilgan demodan chiqish', judgeMode: 'Hakam rejimi',
    judgeModeHint: 'Uch bosqichli hikoya bo‘ylab yuring. Har bir amal faqat siz bosganingizda bajariladi.',
    understand: 'Tushunish', understandHint: 'Tasdiqlangan foyda va dalillangan javobdan boshlang.',
    simulate: 'Simulyatsiya', simulateHint: 'Backend qaytargan ssenariyni zaxira ta’siri bilan ko‘ring.',
    approveStage: 'Tasdiqlash', approveStageHint: 'Proposal inson qarorini kutadi; tizim mustaqil xarajat qilmaydi.',
    decisionCommand: 'Qaror boshqaruvi', verifiedGrossProfit: 'Tasdiqlangan yalpi foyda', immutableEvidenceCount: 'O‘zgarmas dalillar',
    currentDecision: 'Joriy qaror', autonomousSpend: 'Mustaqil xarajat', humanApproval: 'Inson tasdig‘i', required: 'Majburiy',
    demoPlaceholder: 'Demo joytutgichi', awaitingVerifiedBrief: 'Tasdiqlangan brief kutilmoqda', noEvidenceLoaded: 'Dalil hali yuklanmagan', noProposalYet: 'Proposal hali yaratilmagan',
    trustImmutable: 'O‘zgarmas dalillar', trustDeterministic: 'Deterministik hisob-kitoblar', trustHumanApproval: 'Inson tasdig‘i majburiy', trustZeroSpend: 'Mustaqil xarajat nol',
    evidenceBackedAnswer: 'Dalillarga asoslangan javob', answerHint: 'Javob, faktlar, farazlar, cheklovlar va vosita manbasi bitta to‘liq kenglikdagi izda.',
    decisionTrace: 'Qaror izi', decisionTraceHint: 'Faqat xavfsiz ommaviy javob maydonlaridan tuzilgan tizim hodisalari.',
    traceQuestionReceived: 'Savol qabul qilindi', traceToolSelected: 'Deterministik vosita tanlandi', traceEvidenceLoaded: 'O‘zgarmas dalil yuklandi',
    traceGroundingChecked: 'Raqamli asoslanganlik tekshirildi', traceClassificationPreserved: 'Tasnif saqlandi', traceAnswerReleased: 'Javob chiqarildi',
    tracePending: 'Kutilmoqda', traceComplete: 'Bajarildi', traceBlocked: 'To‘xtatildi', evidenceReferences: 'Dalil havolalari',
    before: 'Oldin', after: 'Keyin', coverage: 'Qamrov', daysUnit: 'kun',
    simulatorSafetyTitle: 'Inson nazoratidagi ssenariy', humanReviewRequired: 'Inson ko‘rigi majburiy', noSupplierContacted: 'Yetkazib beruvchiga xabar berilmadi',
    noPaymentInitiated: 'To‘lov boshlanmadi', noInventoryChanged: 'Zaxira o‘zgarmadi',
  },
  RU: {
    productPromise: 'Операционная система доказательных решений для розничной торговли.',
    productSupport: 'Она не угадывает. Она доказывает, моделирует и ждёт одобрения человека.',
    judgeStart: 'Запустить 90-секундную демонстрацию', judgeExit: 'Выйти из демонстрации', judgeMode: 'Режим жюри',
    judgeModeHint: 'Пройдите три этапа истории. Каждое действие выполняется только после вашего нажатия.',
    understand: 'Понять', understandHint: 'Начните с подтверждённой валовой прибыли и доказательного ответа.',
    simulate: 'Смоделировать', simulateHint: 'Посмотрите влияние сценария, рассчитанного backend, на запас.',
    approveStage: 'Одобрить', approveStageHint: 'Proposal ждёт решения человека; система не расходует средства самостоятельно.',
    decisionCommand: 'Командная панель решения', verifiedGrossProfit: 'Подтверждённая валовая прибыль', immutableEvidenceCount: 'Неизменяемые доказательства',
    currentDecision: 'Текущее решение', autonomousSpend: 'Автономные расходы', humanApproval: 'Одобрение человека', required: 'Обязательно',
    demoPlaceholder: 'Демо-заполнитель', awaitingVerifiedBrief: 'Ожидается подтверждённый brief', noEvidenceLoaded: 'Доказательства ещё не загружены', noProposalYet: 'Proposal ещё не создан',
    trustImmutable: 'Неизменяемые доказательства', trustDeterministic: 'Детерминированные расчёты', trustHumanApproval: 'Требуется одобрение человека', trustZeroSpend: 'Нулевые автономные расходы',
    evidenceBackedAnswer: 'Ответ, подтверждённый доказательствами', answerHint: 'Ответ, факты, допущения, ограничения и происхождение инструмента показаны в одной полноширинной цепочке.',
    decisionTrace: 'Трассировка решения', decisionTraceHint: 'Системные события только из безопасных публичных полей ответа.',
    traceQuestionReceived: 'Вопрос получен', traceToolSelected: 'Выбран детерминированный инструмент', traceEvidenceLoaded: 'Загружено неизменяемое доказательство',
    traceGroundingChecked: 'Проверена числовая обоснованность', traceClassificationPreserved: 'Классификация сохранена', traceAnswerReleased: 'Ответ опубликован',
    tracePending: 'Ожидается', traceComplete: 'Выполнено', traceBlocked: 'Остановлено', evidenceReferences: 'Ссылки на доказательства',
    before: 'До', after: 'После', coverage: 'Покрытие', daysUnit: 'дн.',
    simulatorSafetyTitle: 'Сценарий под контролем человека', humanReviewRequired: 'Требуется проверка человеком', noSupplierContacted: 'Поставщик не уведомлён',
    noPaymentInitiated: 'Платёж не инициирован', noInventoryChanged: 'Запасы не изменены',
  },
  EN: {
    productPromise: 'Evidence-first operating system for retail decisions.',
    productSupport: 'It does not guess. It proves, simulates, and waits for human approval.',
    judgeStart: 'Start 90-second guided demo', judgeExit: 'Exit guided demo', judgeMode: 'Judge mode',
    judgeModeHint: 'Follow the three-stage story. Every action runs only when you choose it.',
    understand: 'Understand', understandHint: 'Start with verified gross profit and an evidence-backed answer.',
    simulate: 'Simulate', simulateHint: 'See the inventory impact of the backend-returned scenario.',
    approveStage: 'Approve', approveStageHint: 'The proposal waits for a human decision; the system never spends autonomously.',
    decisionCommand: 'Decision command', verifiedGrossProfit: 'Verified Gross Profit', immutableEvidenceCount: 'Immutable evidence',
    currentDecision: 'Current decision', autonomousSpend: 'Autonomous spend', humanApproval: 'Human approval', required: 'Required',
    demoPlaceholder: 'Demo placeholder', awaitingVerifiedBrief: 'Awaiting verified brief', noEvidenceLoaded: 'No evidence loaded yet', noProposalYet: 'No proposal yet',
    trustImmutable: 'Immutable evidence', trustDeterministic: 'Deterministic calculations', trustHumanApproval: 'Human approval required', trustZeroSpend: 'Zero autonomous spend',
    evidenceBackedAnswer: 'Evidence-backed answer', answerHint: 'Answer, facts, evidence, assumptions, limitations, and tool provenance in one full-width trace.',
    decisionTrace: 'Decision trace', decisionTraceHint: 'System events built only from safe public response fields.',
    traceQuestionReceived: 'Question received', traceToolSelected: 'Deterministic tool selected', traceEvidenceLoaded: 'Immutable evidence loaded',
    traceGroundingChecked: 'Numeric grounding checked', traceClassificationPreserved: 'Classification preserved', traceAnswerReleased: 'Answer released',
    tracePending: 'Pending', traceComplete: 'Complete', traceBlocked: 'Stopped', evidenceReferences: 'Evidence references',
    before: 'Before', after: 'After', coverage: 'Coverage', daysUnit: 'days',
    simulatorSafetyTitle: 'Human-controlled scenario', humanReviewRequired: 'Human review required', noSupplierContacted: 'No supplier contacted',
    noPaymentInitiated: 'No payment initiated', noInventoryChanged: 'No inventory changed',
  },
};
const REDESIGN_TEXT = Object.freeze({
  UZ: Object.freeze({
    demoNotice: 'Bu muhit anonim namuna ma’lumotlaridan foydalanadi va ishchi tizimga hech narsa yozmaydi.',
    grossProfitBrief: 'Kunlik yalpi foyda hisoboti',
    generateBrief: 'Hisobot yaratish',
    noBrief: 'Tanlangan davr uchun hisobot yarating.',
    simulatorHint: 'Server hisoblagan deterministik ssenariy. Simulyatsiya ko‘rib chiqish taklifini yaratmaydi.',
    analysisRun: 'Tahlil yozuvi',
    proposalReview: 'Taklifni ko‘rib chiqish',
    proposalHint: 'Simulyatsiyadan inson qarorigacha bo‘lgan nazoratli yo‘l.',
    createProposal: 'Ko‘rib chiqish uchun taklif yaratish',
    proposalId: 'Taklif ID',
    idempotentReplay: 'Avval yaratilgan ayni taklif xavfsiz qaytarildi.',
    noProposal: 'Avval mos simulyatsiyadan ko‘rib chiqish taklifini yarating.',
    approveProposal: 'Taklifni tasdiqlash',
    rejectProposal: 'Taklifni rad etish',
    decisionConfirmed: 'Qaror server tomonidan tasdiqlandi.',
    integrityRecorded: 'O‘zgarmas nazorat izi qayd etilgan',
    actionLedger: 'Amallar jurnali',
    recordedHistory: 'Qayd etilgan qarorlar tarixi',
    ledgerHint: 'O‘zgarmas, faqat o‘qiladigan hodisalar.',
    proposalReference: 'Taklif',
    validationBounds: 'Ssenariy qiymatlari server chegaralariga mos emas.',
    backendUnavailable: 'Server bilan aloqa o‘rnatilmadi.',
    conflict: 'Holat o‘zgargan yoki tanlangan yetkazib beruvchi avvalgi taklifga zid.',
    estimatedDescription: 'Server farazlari asosidagi taxminiy natija.',
    judgeModeHint: 'Yetti bosqichli qaror yo‘lidan o‘ting. Har bir amal faqat siz tanlaganingizda bajariladi.',
    simulateHint: 'Server qaytargan ssenariyning zaxiraga ta’sirini ko‘ring.',
    approveStageHint: 'Taklif inson qarorini kutadi; tizim mustaqil xarajat qilmaydi.',
    awaitingVerifiedBrief: 'Tasdiqlangan hisobot kutilmoqda',
    noProposalYet: 'Taklif hali yaratilmagan',
    policyAutonomousTooltip: 'Inson tasdig‘i va faqat DRAFT yaratish siyosati bilan ta’minlanadi.',
    workflowRail: 'Qaror yo‘li',
    workflowProgress: 'Jarayon holati',
    workflowComplete: 'Bajarildi',
    workflowCurrent: 'Joriy',
    workflowBlocked: 'To‘xtatildi',
    workflowNotStarted: 'Boshlanmagan',
    judgeStageGrossProfit: 'Tasdiqlangan yalpi foydani tushuning',
    judgeStageGrossProfitHint: 'Deterministik hisobot va uning o‘zgarmas dalillarini ko‘ring.',
    judgeStageAskProof: 'Do‘kondan so‘rang va dalilni tekshiring',
    judgeStageAskProofHint: 'Javobdagi har bir biznes raqamini uning daliliga bog‘lang.',
    judgeStageCompareFutures: 'Mumkin bo‘lgan zaxira holatlarini solishtiring',
    judgeStageCompareFuturesHint: 'Uchta alohida server simulyatsiyasini yonma-yon ko‘ring.',
    judgeStagePolicy: 'Siyosat himoyalarini ko‘ring',
    judgeStagePolicyHint: 'Tizim siyosatini ayni jarayonda kuzatilgan dalildan ajrating.',
    judgeStageProposal: 'Inson ko‘rigi uchun taklif yarating',
    judgeStageProposalHint: 'Faqat tanlangan server simulyatsiyasi ko‘rib chiqishga o‘tadi.',
    judgeStageApproveDraft: 'Faqat bitta DRAFT yaratishni tasdiqlang',
    judgeStageApproveDraftHint: 'Qaror egaga tegishli; tizim buyurtma bermaydi va to‘lov qilmaydi.',
    judgeStageLedger: 'O‘zgarmas jurnalni tekshiring',
    judgeStageLedgerHint: 'Tahlildan DRAFTgacha bo‘lgan xavfsiz hodisalar zanjirini ko‘ring.',
    judgeBack: 'Orqaga',
    judgeNext: 'Keyingi',
    judgeStepOf: 'Bosqich',
    judgeDuration: '90 soniya',
    policyRecorded: 'Qayd etilgan',
    briefAssumptionPeriod: 'Savdo sanasi Asia/Tashkent vaqt mintaqasida boshlanishni o‘z ichiga oladi va tugashni o‘z ichiga olmaydi.',
    briefAssumptionRevenueSnapshot: 'Tushum hisobot paytidagi totalUzs qiymatidan refundedTotalUzs ayirilgan natijadir.',
    briefAssumptionCreditSales: 'Kredit savdolar kiritiladi, chunki saqlangan Sale kassa yopilishida qayd etilgan yozuvdir.',
    briefLimitationCurrency: 'Valyuta kelib chiqishi yo‘q, aralash yoki UZS standartiga mos emas; jamlanma ko‘rsatilmaydi.',
    briefLimitationMissingCost: 'Kamida bitta savdo qatorida tranzaksiya paytidagi costAtSaleUzs yo‘q; joriy mahsulot tannarxi ishlatilmaydi.',
    briefLimitationRefundQuantity: 'Qaytarilgan miqdor sotilgan miqdor chegarasidan tashqarida; COGS ishonchli emas.',
    briefLimitationLegacyCost: 'Kamida bitta tannarx surati LEGACY_OR_UNKNOWN; shu sabab natija tasdiqlangan emas, taxminiy.',
    briefNarrativeUnavailable: 'Tasdiqlangan hisobot shartnomasida mavjud emas',
    ledgerEventProposalCreated: 'Qayta buyurtma simulyatsiyasidan taklif yaratildi',
    ledgerEventProposalApproved: 'Taklif inson tomonidan tasdiqlandi',
    ledgerEventProposalRejected: 'Taklif inson tomonidan rad etildi',
    ledgerEventDraftCreated: 'PurchaseOrder DRAFT yaratildi',
    ledgerEventIdempotentReplay: 'Mavjud natija xavfsiz qaytarildi',
    ledgerEventUnknown: 'Qayd etilgan qaror hodisasi',
    ledgerOutcomeAwaitingReview: 'Inson ko‘rigi kutilmoqda',
    ledgerOutcomeApproved: 'Inson tasdig‘i qayd etildi',
    ledgerOutcomeRejected: 'Inson rad javobi qayd etildi',
    ledgerOutcomeDraftCreated: 'Bitta DRAFT qayd etildi',
    ledgerOutcomeReplayed: 'Mavjud natija qayta ishlatildi',
    ledgerOutcomeUnknown: 'Natija xavfsiz qayd etildi',
    ledgerActorAuthorized: 'Vakolatli ish maydoni ishtirokchisi',
    ledgerDetailProposalCreated: 'Server hisoblagan simulyatsiya inson ko‘rigiga o‘tkazildi.',
    ledgerDetailProposalApproved: 'Inson tasdig‘i qayd etildi; operatsion ijro bajarilmadi.',
    ledgerDetailProposalRejected: 'Inson rad javobi qayd etildi; DRAFT yaratilmadi.',
    ledgerDetailDraftCreated: 'Ko‘pi bilan bitta PurchaseOrder DRAFT qayd etildi; yetkazib beruvchi, to‘lov, qabul yoki zaxira amali bajarilmadi.',
    ledgerDetailIdempotentReplay: 'Mavjud natija qo‘shimcha DRAFT yaratmasdan qaytarildi.',
    ledgerDetailUnknown: 'Faqat o‘qiladigan qaror hodisasi qayd etildi; xom tafsilotlar yashirildi.',
    simulationRiskStockoutBeforeLead: 'Taxminiy zaxira yetkazish muddati tugashidan oldin tugaydi',
    simulationRiskNoStockoutWithinLead: 'Faraz qilingan yetkazish muddati ichida zaxira tugashi kutilmaydi',
    simulationRiskAboveTarget: 'Taxminiy zaxira ssenariy maqsadidan yuqori',
    simulationRiskNoOverstock: 'Ssenariyda ortiqcha zaxira aniqlanmadi',
    simulationRiskNoObservedSales: 'Tanlangan kuzatuv davrida savdo kuzatilmadi',
    simulationRiskInsufficient: 'Ssenariyni tasdiqlash uchun ma’lumot yetarli emas',
    simulationRiskNegativeOnHand: 'Joriy zaxira manfiy; ssenariy tasdiqlanmaydi',
    simulationRiskInvalidProductData: 'Mahsulot birligi, valyutasi yoki qaytarish miqdori ssenariyni tasdiqlamaydi',
    simulationRiskExceedsSafeLimit: 'Ssenariy miqdori xavfsiz chegaradan oshadi',
    simulationRiskLow: 'Past',
    simulationRiskHigh: 'Yuqori',
    simulationValueUnavailable: 'Tasdiqlangan dalil shartnomasida mavjud emas',
    simulationAssumptionLeadTime: 'Yetkazish muddati egaga ko‘rinadigan ssenariy farazi: {0} kun.',
    simulationAssumptionSafetyStock: 'Xavfsizlik zaxirasi egaga ko‘rinadigan ssenariy farazi: {0} kun.',
    simulationAssumptionForecastHorizon: 'Prognoz ufqi egaga ko‘rinadigan ssenariy farazi: {0} kun.',
    simulationFormula: 'Deterministik formula: max(0, ceil(netUnitsSold/lookbackDays * (leadTimeDays + safetyStockDays + forecastHorizonDays) - currentOnHand)).',
    simulationLimitationOperations: 'Rezervlangan zaxira, kiruvchi xarid buyurtmasi, yetkazib berish yoki birliklararo aylantirish mavjud deb da’vo qilinmaydi.',
    simulationLimitationLotCost: 'Joriy zaxirada o‘zgarmas partiya tannarxi kelib chiqishi yo‘qligi sabab bog‘langan kapital mavjud emas.',
    traceCurrent: 'Joriy',
    traceNotStarted: 'Boshlanmagan',
    decisionTwin: 'SavdoGraph qaror egizagi',
    decisionTwinHint: 'Bir kelajakni taxmin qilmaydi: bir nechta server hisoblagan holatni dalillari bilan ko‘rsatadi.',
    runDecisionTwin: 'Uch ssenariyni hisoblash',
    twinNoAction: 'Hech narsa qilmaslik',
    twinBalanced: 'Muvozanatli qamrov',
    twinHighCoverage: 'Yuqori qamrov',
    twinPresetsHint: 'Bir mahsulot va davr; yetkazish 2 kun, prognoz 7 kun, xavfsizlik zaxirasi 0 / 3 / 14 kun.',
    selectScenarioForReview: 'Ko‘rib chiqish uchun tanlash',
    selectedForReview: 'Ko‘rib chiqish uchun tanlandi',
    twinUnsupported: 'Qaror egizagini ushbu natijalar bilan xavfsiz ko‘rsatib bo‘lmaydi.',
    twinIncoherent: 'Server natijalari bitta izchil taqqoslashni tasdiqlamadi.',
    scenarioNoAction: 'Hech narsa qilmaslik',
    scenarioBalanced: 'Muvozanatli qamrov',
    scenarioHighCoverage: 'Yuqori qamrov',
    scenarioServerBacked: 'Server hisobiga asoslangan',
    scenarioUnsupported: 'Qo‘llab-quvvatlanmaydi',
    scenarioEvidenceMissing: 'Raqamli natija uchun dalil yetishmaydi',
    selectForProposal: 'Taklif uchun tanlash',
    selectedForProposal: 'Taklif uchun tanlandi',
    simulationOnly: 'Faqat simulyatsiya',
    proofGraph: 'Interaktiv dalil grafigi',
    proofGraphHint: 'Faqat qaytarilgan IDlar bilan isbotlangan bog‘lanishlar ko‘rsatiladi.',
    proofGraphEmpty: 'Bog‘lanishni ko‘rsatish uchun dalillangan natija hali yo‘q.',
    proofGraphMobileHint: 'Dalil yo‘li o‘qish tartibida ko‘rsatilgan.',
    focusWorkspace: 'Tegishli ish maydoniga o‘tish',
    proofSourceRecords: 'Manba savdolari, qaytarishlar va tannarx holatlari',
    proofRevenueEvidence: 'Tushum dalili',
    proofRefundEvidence: 'Qaytarish dalili',
    proofCogsEvidence: 'COGS dalili',
    proofGrossProfit: 'Tasdiqlangan yalpi foyda',
    proofExplanation: 'Dalillangan izoh',
    proofSimulation: 'Qayta buyurtma simulyatsiyasi',
    proofProposal: 'Ko‘rib chiqish taklifi',
    proofOwnerDecision: 'Ega qarori',
    proofDraft: 'PurchaseOrder DRAFT',
    proofLedgerEvent: 'Jurnal hodisasi',
    policyShield: 'Siyosat qalqoni',
    policyShieldHint: 'Doimiy tizim kafolatlari ayni jarayonda isbotlangan holatlardan alohida ko‘rsatiladi.',
    systemPolicy: 'TIZIM SIYOSATI',
    currentRun: 'JORIY JARAYON',
    enforcementSource: 'Ta’minlash manbasi',
    policyEnforced: 'Siyosat bilan ta’minlangan',
    policyVerified: 'Ayni jarayonda tasdiqlangan',
    policyPending: 'Kutilmoqda',
    policyNotObserved: 'Ayni jarayonda kuzatilmagan',
    policyBlocked: 'Xavfsiz tarzda to‘xtatilgan',
    sourceBackendContract: 'Server shartnomasi',
    sourceDatabaseConstraint: 'Ma’lumotlar bazasi cheklovi',
    sourceAuthorization: 'Ruxsat nazorati',
    sourceAppendOnlyLedger: 'Faqat qo‘shiladigan jurnal',
    policyImmutableEvidence: 'O‘zgarmas dalil talab qilinadi',
    policyImmutableEvidenceHint: 'Biznes natijalari dalil IDlari orqali o‘zgarmas yozuvlarga bog‘lanadi.',
    policyDeterministicCalculations: 'Deterministik hisob-kitoblar',
    policyDeterministicCalculationsHint: 'Yalpi foyda va zaxira ssenariylari versiyalangan server formulalarida hisoblanadi.',
    policyNumericGrounding: 'Raqamli asoslash talab qilinadi',
    policyNumericGroundingHint: 'Dalilga bog‘lanmagan biznes raqami foydalanuvchiga chiqarilmaydi.',
    policyHumanApproval: 'Inson tasdig‘i talab qilinadi',
    policyHumanApprovalHint: 'Taklif faqat vakolatli egadan aniq qaror olgach davom etadi.',
    policySupplierIsolation: 'Simulyatsiya yetkazib beruvchiga xabar bermaydi',
    policySupplierIsolationHint: 'Simulyatsiya va taklif yaratish tashqi aloqa amalini bajarmaydi.',
    policyNoPayment: 'To‘lov boshlanmaydi',
    policyNoPaymentHint: 'Tasdiqlash yo‘li hech qanday to‘lov amalini ishga tushirmaydi.',
    policyNoInventoryMutation: 'Zaxira o‘zgarmaydi',
    policyNoInventoryMutationHint: 'Simulyatsiya, taklif va DRAFT mavjud zaxirani o‘zgartirmaydi.',
    policyOneDraft: 'Ko‘pi bilan bitta PurchaseOrder DRAFT',
    policyOneDraftHint: 'Idempotent qaror shartnomasi bitta taklif uchun takroriy DRAFTni to‘sadi.',
    policyZeroSpend: 'Mustaqil xarajat: 0 UZS',
    policyZeroSpendHint: 'Bu moliyaviy hisob emas, inson tasdig‘iga bog‘langan tizim siyosatidir.',
    policyTenantIsolation: 'Do‘konlararo izolyatsiya',
    policyTenantIsolationHint: 'Server ruxsat va do‘kon konteksti orqali har bir so‘rovni chegaralaydi.',
    primaryBusinessAnswer: 'Asosiy biznes javobi',
    verifiedFacts: 'Dalillarga bog‘langan faktlar',
    technicalMetadata: 'Texnik ma’lumotlar',
    approvalCreatesOneDraft: 'Tasdiqlash ko‘pi bilan bitta PurchaseOrder DRAFT yaratadi.',
  }),
  RU: Object.freeze({
    demoNotice: 'В этой среде используются анонимные демонстрационные данные; в рабочую систему ничего не записывается.',
    grossProfitBrief: 'Ежедневный отчёт о валовой прибыли',
    generateBrief: 'Создать отчёт',
    noBrief: 'Создайте отчёт за выбранный период.',
    simulatorHint: 'Детерминированный сценарий рассчитан сервером. Симуляция не создаёт предложение на рассмотрение.',
    analysisRun: 'Запись анализа',
    proposalReview: 'Рассмотрение предложения',
    proposalHint: 'Контролируемый путь от симуляции до решения человека.',
    createProposal: 'Создать предложение на рассмотрение',
    proposalId: 'ID предложения',
    idempotentReplay: 'Безопасно возвращено ранее созданное такое же предложение.',
    noProposal: 'Сначала создайте предложение из подходящей симуляции.',
    approveProposal: 'Одобрить предложение',
    rejectProposal: 'Отклонить предложение',
    decisionConfirmed: 'Решение подтверждено сервером.',
    integrityRecorded: 'Неизменяемая контрольная запись сохранена',
    actionLedger: 'Журнал действий',
    recordedHistory: 'История зафиксированных решений',
    ledgerHint: 'Неизменяемые события только для чтения.',
    proposalReference: 'Предложение',
    validationBounds: 'Значения сценария выходят за допустимые серверные границы.',
    backendUnavailable: 'Нет связи с сервером.',
    conflict: 'Состояние изменилось или выбранный поставщик не соответствует предыдущему предложению.',
    estimatedDescription: 'Оценочный результат на основе серверных допущений.',
    judgeModeHint: 'Пройдите семь этапов решения. Каждое действие выполняется только после вашего выбора.',
    simulateHint: 'Посмотрите влияние возвращённого сервером сценария на запас.',
    approveStageHint: 'Предложение ждёт решения человека; система не расходует средства самостоятельно.',
    awaitingVerifiedBrief: 'Ожидается подтверждённый отчёт',
    noProposalYet: 'Предложение ещё не создано',
    policyAutonomousTooltip: 'Обеспечивается одобрением человека и исполнением только в статусе DRAFT.',
    workflowRail: 'Путь решения',
    workflowProgress: 'Состояние процесса',
    workflowComplete: 'Завершено',
    workflowCurrent: 'Текущий этап',
    workflowBlocked: 'Остановлено',
    workflowNotStarted: 'Не начато',
    judgeStageGrossProfit: 'Разберите подтверждённую валовую прибыль',
    judgeStageGrossProfitHint: 'Изучите детерминированный отчёт и его неизменяемые доказательства.',
    judgeStageAskProof: 'Задайте вопрос магазину и проверьте доказательства',
    judgeStageAskProofHint: 'Свяжите каждое бизнес-число в ответе с его доказательством.',
    judgeStageCompareFutures: 'Сравните возможные состояния запасов',
    judgeStageCompareFuturesHint: 'Сопоставьте три независимые серверные симуляции.',
    judgeStagePolicy: 'Проверьте защитные политики',
    judgeStagePolicyHint: 'Отделите системные политики от доказательств текущего запуска.',
    judgeStageProposal: 'Создайте предложение для проверки человеком',
    judgeStageProposalHint: 'На рассмотрение переходит только выбранная серверная симуляция.',
    judgeStageApproveDraft: 'Одобрите переход только к одному DRAFT',
    judgeStageApproveDraftHint: 'Решение принимает владелец; система не заказывает и не оплачивает.',
    judgeStageLedger: 'Проверьте неизменяемый журнал',
    judgeStageLedgerHint: 'Проследите безопасную цепочку событий от анализа до DRAFT.',
    judgeBack: 'Назад',
    judgeNext: 'Далее',
    judgeStepOf: 'Этап',
    judgeDuration: '90 секунд',
    policyRecorded: 'Записано',
    briefAssumptionPeriod: 'Дата продажи включает начало и исключает конец периода в часовом поясе Asia/Tashkent.',
    briefAssumptionRevenueSnapshot: 'Выручка равна сохранённому totalUzs за вычетом refundedTotalUzs на момент отчёта.',
    briefAssumptionCreditSales: 'Продажи в кредит включены, потому что сохранённая Sale является учётной записью закрытия чека.',
    briefLimitationCurrency: 'Происхождение валюты отсутствует, смешано или не соответствует UZS; итог не показывается.',
    briefLimitationMissingCost: 'Хотя бы у одной строки продажи нет costAtSaleUzs на момент транзакции; текущая себестоимость товара не используется.',
    briefLimitationRefundQuantity: 'Возвращённое количество выходит за пределы проданного; COGS нельзя считать надёжным.',
    briefLimitationLegacyCost: 'Хотя бы один снимок себестоимости имеет LEGACY_OR_UNKNOWN, поэтому результат оценочный, а не подтверждённый.',
    briefNarrativeUnavailable: 'Недоступно в подтверждённом контракте отчёта',
    ledgerEventProposalCreated: 'Предложение создано из симуляции повторного заказа',
    ledgerEventProposalApproved: 'Предложение одобрено человеком',
    ledgerEventProposalRejected: 'Предложение отклонено человеком',
    ledgerEventDraftCreated: 'Создан PurchaseOrder DRAFT',
    ledgerEventIdempotentReplay: 'Существующий результат безопасно возвращён',
    ledgerEventUnknown: 'Записанное событие решения',
    ledgerOutcomeAwaitingReview: 'Ожидает проверки человеком',
    ledgerOutcomeApproved: 'Одобрение человека записано',
    ledgerOutcomeRejected: 'Отклонение человеком записано',
    ledgerOutcomeDraftCreated: 'Записан один DRAFT',
    ledgerOutcomeReplayed: 'Существующий результат использован повторно',
    ledgerOutcomeUnknown: 'Результат безопасно записан',
    ledgerActorAuthorized: 'Авторизованный участник рабочего пространства',
    ledgerDetailProposalCreated: 'Рассчитанная сервером симуляция передана на проверку человеку.',
    ledgerDetailProposalApproved: 'Одобрение человека записано; операционное исполнение не выполнялось.',
    ledgerDetailProposalRejected: 'Отклонение человеком записано; DRAFT не создан.',
    ledgerDetailDraftCreated: 'Записан не более чем один PurchaseOrder DRAFT; действий с поставщиком, оплатой, приёмкой или запасом не было.',
    ledgerDetailIdempotentReplay: 'Существующий результат возвращён без создания дополнительного DRAFT.',
    ledgerDetailUnknown: 'Записано событие решения только для чтения; исходные детали скрыты.',
    simulationRiskStockoutBeforeLead: 'Оценочно запас закончится до истечения срока поставки',
    simulationRiskNoStockoutWithinLead: 'В пределах предполагаемого срока поставки дефицит не ожидается',
    simulationRiskAboveTarget: 'Оценочный запас выше цели сценария',
    simulationRiskNoOverstock: 'Сценарий не показывает избыточный запас',
    simulationRiskNoObservedSales: 'В выбранном периоде наблюдения продажи не зафиксированы',
    simulationRiskInsufficient: 'Недостаточно данных для подтверждения сценария',
    simulationRiskNegativeOnHand: 'Текущий запас отрицательный; сценарий не подтверждён',
    simulationRiskInvalidProductData: 'Единица, валюта или возвраты товара не позволяют подтвердить сценарий',
    simulationRiskExceedsSafeLimit: 'Количество сценария превышает безопасный предел',
    simulationRiskLow: 'Низкий',
    simulationRiskHigh: 'Высокий',
    simulationValueUnavailable: 'Недоступно в подтверждённом контракте доказательств',
    simulationAssumptionLeadTime: 'Срок поставки — видимое владельцу допущение сценария: {0} дней.',
    simulationAssumptionSafetyStock: 'Страховой запас — видимое владельцу допущение сценария: {0} дней.',
    simulationAssumptionForecastHorizon: 'Горизонт прогноза — видимое владельцу допущение сценария: {0} дней.',
    simulationFormula: 'Детерминированная формула: max(0, ceil(netUnitsSold/lookbackDays * (leadTimeDays + safetyStockDays + forecastHorizonDays) - currentOnHand)).',
    simulationLimitationOperations: 'Не заявляется наличие зарезервированного запаса, входящего заказа, доставки поставщика или межединичного преобразования.',
    simulationLimitationLotCost: 'Связанный капитал недоступен: у текущего запаса нет неизменяемого происхождения себестоимости партии.',
    traceCurrent: 'Текущий',
    traceNotStarted: 'Не начато',
    decisionTwin: 'Двойник решения SavdoGraph',
    decisionTwinHint: 'Он не предсказывает одно будущее, а показывает несколько рассчитанных сервером сценариев с доказательствами.',
    runDecisionTwin: 'Рассчитать три сценария',
    twinNoAction: 'Без действия',
    twinBalanced: 'Сбалансированное покрытие',
    twinHighCoverage: 'Высокое покрытие',
    twinPresetsHint: 'Один товар и период; поставка 2 дня, прогноз 7 дней, страховой запас 0 / 3 / 14 дней.',
    selectScenarioForReview: 'Выбрать для рассмотрения',
    selectedForReview: 'Выбрано для рассмотрения',
    twinUnsupported: 'Двойник решения нельзя безопасно показать по этим результатам.',
    twinIncoherent: 'Серверные результаты не подтверждают единое согласованное сравнение.',
    scenarioNoAction: 'Без действия',
    scenarioBalanced: 'Сбалансированное покрытие',
    scenarioHighCoverage: 'Высокое покрытие',
    scenarioServerBacked: 'Рассчитано сервером',
    scenarioUnsupported: 'Не поддерживается',
    scenarioEvidenceMissing: 'Для числового результата не хватает доказательства',
    selectForProposal: 'Выбрать для предложения',
    selectedForProposal: 'Выбрано для предложения',
    simulationOnly: 'Только симуляция',
    proofGraph: 'Интерактивный граф доказательств',
    proofGraphHint: 'Показаны только связи, подтверждённые возвращёнными ID.',
    proofGraphEmpty: 'Пока нет доказательного результата для отображения связей.',
    proofGraphMobileHint: 'Цепочка доказательств показана в порядке чтения.',
    focusWorkspace: 'Перейти к связанному разделу',
    proofSourceRecords: 'Продажи, возвраты и снимки себестоимости',
    proofRevenueEvidence: 'Доказательство выручки',
    proofRefundEvidence: 'Доказательство возвратов',
    proofCogsEvidence: 'Доказательство COGS',
    proofGrossProfit: 'Подтверждённая валовая прибыль',
    proofExplanation: 'Доказательное объяснение',
    proofSimulation: 'Симуляция повторного заказа',
    proofProposal: 'Предложение на рассмотрение',
    proofOwnerDecision: 'Решение владельца',
    proofDraft: 'PurchaseOrder DRAFT',
    proofLedgerEvent: 'Событие журнала',
    policyShield: 'Щит политик',
    policyShieldHint: 'Постоянные системные гарантии отделены от подтверждений текущего запуска.',
    systemPolicy: 'СИСТЕМНАЯ ПОЛИТИКА',
    currentRun: 'ТЕКУЩИЙ ЗАПУСК',
    enforcementSource: 'Источник обеспечения',
    policyEnforced: 'Обеспечено политикой',
    policyVerified: 'Подтверждено в текущем запуске',
    policyPending: 'Ожидается',
    policyNotObserved: 'Не наблюдалось в текущем запуске',
    policyBlocked: 'Безопасно остановлено',
    sourceBackendContract: 'Серверный контракт',
    sourceDatabaseConstraint: 'Ограничение базы данных',
    sourceAuthorization: 'Контроль доступа',
    sourceAppendOnlyLedger: 'Журнал только с добавлением',
    policyImmutableEvidence: 'Требуются неизменяемые доказательства',
    policyImmutableEvidenceHint: 'Бизнес-результаты связаны с неизменяемыми записями через ID доказательств.',
    policyDeterministicCalculations: 'Детерминированные расчёты',
    policyDeterministicCalculationsHint: 'Валовая прибыль и сценарии запасов рассчитываются версионированными серверными формулами.',
    policyNumericGrounding: 'Требуется числовое обоснование',
    policyNumericGroundingHint: 'Бизнес-число без связи с доказательством не выводится пользователю.',
    policyHumanApproval: 'Требуется одобрение человека',
    policyHumanApprovalHint: 'Предложение продолжает путь только после явного решения уполномоченного владельца.',
    policySupplierIsolation: 'Симуляция не связывается с поставщиком',
    policySupplierIsolationHint: 'Симуляция и создание предложения не выполняют внешних коммуникаций.',
    policyNoPayment: 'Платёж не инициируется',
    policyNoPaymentHint: 'Путь одобрения не запускает платёжных операций.',
    policyNoInventoryMutation: 'Запасы не изменяются',
    policyNoInventoryMutationHint: 'Симуляция, предложение и DRAFT не меняют существующие запасы.',
    policyOneDraft: 'Не более одного PurchaseOrder DRAFT',
    policyOneDraftHint: 'Идемпотентный контракт решения блокирует повторный DRAFT для одного предложения.',
    policyZeroSpend: 'Автономные расходы: 0 UZS',
    policyZeroSpendHint: 'Это системная политика, связанная с одобрением человека, а не финансовый расчёт.',
    policyTenantIsolation: 'Изоляция магазинов',
    policyTenantIsolationHint: 'Сервер ограничивает каждый запрос контекстом магазина и разрешениями.',
    primaryBusinessAnswer: 'Главный бизнес-ответ',
    verifiedFacts: 'Факты с доказательствами',
    technicalMetadata: 'Технические сведения',
    approvalCreatesOneDraft: 'Одобрение создаёт не более одного PurchaseOrder DRAFT.',
  }),
  EN: Object.freeze({
    demoNotice: 'This environment uses anonymized demo data and writes nothing to the production system.',
    grossProfitBrief: 'Daily Gross Profit Brief',
    generateBrief: 'Generate brief',
    noBrief: 'Generate a brief for the selected period.',
    simulatorHint: 'A deterministic scenario calculated by the server. A simulation does not create a review proposal.',
    analysisRun: 'Analysis run',
    proposalReview: 'Proposal review',
    proposalHint: 'A controlled path from simulation to a human decision.',
    createProposal: 'Create review proposal',
    proposalId: 'Proposal ID',
    idempotentReplay: 'The previously created identical proposal was returned safely.',
    noProposal: 'Create a proposal from an eligible simulation first.',
    approveProposal: 'Approve proposal',
    rejectProposal: 'Reject proposal',
    decisionConfirmed: 'The decision was confirmed by the server.',
    integrityRecorded: 'Immutable integrity record present',
    actionLedger: 'Action Ledger',
    recordedHistory: 'Recorded decision history',
    ledgerHint: 'Immutable, read-only events.',
    proposalReference: 'Proposal',
    validationBounds: 'Scenario values are outside the server bounds.',
    backendUnavailable: 'The server is unavailable.',
    conflict: 'The state changed or the selected supplier conflicts with the previous proposal.',
    estimatedDescription: 'An estimated result based on server-side assumptions.',
    judgeModeHint: 'Follow the seven-stage decision story. Every action runs only when you choose it.',
    simulateHint: 'See the inventory impact of the server-returned scenario.',
    approveStageHint: 'The proposal waits for a human decision; the system never spends autonomously.',
    awaitingVerifiedBrief: 'Awaiting verified brief',
    noProposalYet: 'No proposal yet',
    policyAutonomousTooltip: 'Enforced by human approval and DRAFT-only execution.',
    workflowRail: 'Decision workflow',
    workflowProgress: 'Workflow status',
    workflowComplete: 'Complete',
    workflowCurrent: 'Current',
    workflowBlocked: 'Blocked',
    workflowNotStarted: 'Not started',
    judgeStageGrossProfit: 'Understand the verified Gross Profit',
    judgeStageGrossProfitHint: 'Inspect the deterministic brief and its immutable evidence.',
    judgeStageAskProof: 'Ask the store and inspect proof',
    judgeStageAskProofHint: 'Connect every business number in the answer to its evidence.',
    judgeStageCompareFutures: 'Compare possible inventory futures',
    judgeStageCompareFuturesHint: 'Compare three independent server-side simulations.',
    judgeStagePolicy: 'Review policy safeguards',
    judgeStagePolicyHint: 'Separate system policy from evidence observed in this run.',
    judgeStageProposal: 'Create a human-review proposal',
    judgeStageProposalHint: 'Only the selected server simulation enters review.',
    judgeStageApproveDraft: 'Approve only to one DRAFT',
    judgeStageApproveDraftHint: 'The owner decides; the system does not order or pay.',
    judgeStageLedger: 'Inspect the immutable ledger',
    judgeStageLedgerHint: 'Follow the safe event chain from analysis to DRAFT.',
    judgeBack: 'Back',
    judgeNext: 'Next',
    judgeStepOf: 'Step',
    judgeDuration: '90 seconds',
    policyRecorded: 'Recorded',
    briefAssumptionPeriod: 'The sale-date period is start-inclusive and end-exclusive in Asia/Tashkent.',
    briefAssumptionRevenueSnapshot: 'Revenue is the saved totalUzs minus refundedTotalUzs as of the brief.',
    briefAssumptionCreditSales: 'Credit sales are included because persisted Sale is the booked checkout record.',
    briefLimitationCurrency: 'Currency provenance is missing, mixed, or not UZS-canonical; no aggregate is shown.',
    briefLimitationMissingCost: 'At least one sale item lacks transaction-time costAtSaleUzs; current product cost is never used.',
    briefLimitationRefundQuantity: 'A refunded quantity is outside its sold quantity; COGS is not trusted.',
    briefLimitationLegacyCost: 'At least one cost snapshot is LEGACY_OR_UNKNOWN, so the result is estimated rather than verified.',
    briefNarrativeUnavailable: 'Unavailable from the approved brief contract',
    ledgerEventProposalCreated: 'Proposal created from reorder simulation',
    ledgerEventProposalApproved: 'Proposal approved by a human',
    ledgerEventProposalRejected: 'Proposal rejected by a human',
    ledgerEventDraftCreated: 'PurchaseOrder DRAFT created',
    ledgerEventIdempotentReplay: 'Existing result safely replayed',
    ledgerEventUnknown: 'Recorded decision event',
    ledgerOutcomeAwaitingReview: 'Awaiting human review',
    ledgerOutcomeApproved: 'Human approval recorded',
    ledgerOutcomeRejected: 'Human rejection recorded',
    ledgerOutcomeDraftCreated: 'One DRAFT recorded',
    ledgerOutcomeReplayed: 'Existing result reused',
    ledgerOutcomeUnknown: 'Outcome safely recorded',
    ledgerActorAuthorized: 'Authorized workspace actor',
    ledgerDetailProposalCreated: 'A server-calculated simulation entered human review.',
    ledgerDetailProposalApproved: 'Human approval was recorded; operational execution did not occur.',
    ledgerDetailProposalRejected: 'Human rejection was recorded; no DRAFT was created.',
    ledgerDetailDraftCreated: 'At most one PurchaseOrder DRAFT was recorded; no supplier, payment, receiving, or inventory action occurred.',
    ledgerDetailIdempotentReplay: 'The existing result was returned without creating an additional DRAFT.',
    ledgerDetailUnknown: 'A read-only decision event was recorded; raw details are hidden.',
    simulationRiskStockoutBeforeLead: 'Estimated stockout before the lead time ends',
    simulationRiskNoStockoutWithinLead: 'No stockout expected within the assumed lead time',
    simulationRiskAboveTarget: 'Estimated inventory above the scenario target',
    simulationRiskNoOverstock: 'No scenario overstock detected',
    simulationRiskNoObservedSales: 'No sales observed in the selected lookback window',
    simulationRiskInsufficient: 'Insufficient data to support the scenario',
    simulationRiskNegativeOnHand: 'Current on-hand stock is negative; the scenario is unsupported',
    simulationRiskInvalidProductData: 'Product unit, currency, or return quantity does not support the scenario',
    simulationRiskExceedsSafeLimit: 'Scenario quantity exceeds the safe limit',
    simulationRiskLow: 'Low',
    simulationRiskHigh: 'High',
    simulationValueUnavailable: 'Unavailable from the approved evidence contract',
    simulationAssumptionLeadTime: 'Lead time is an owner-visible scenario assumption: {0} days.',
    simulationAssumptionSafetyStock: 'Safety stock is an owner-visible scenario assumption: {0} days.',
    simulationAssumptionForecastHorizon: 'Forecast horizon is an owner-visible scenario assumption: {0} days.',
    simulationFormula: 'Deterministic formula: max(0, ceil(netUnitsSold/lookbackDays * (leadTimeDays + safetyStockDays + forecastHorizonDays) - currentOnHand)).',
    simulationLimitationOperations: 'No reserved stock, incoming purchase order, supplier delivery, or cross-unit conversion is claimed.',
    simulationLimitationLotCost: 'Tied-up capital is unavailable because current on-hand inventory has no immutable lot-cost provenance.',
    traceCurrent: 'Current',
    traceNotStarted: 'Not started',
    decisionTwin: 'SavdoGraph Decision Twin',
    decisionTwinHint: 'It does not predict one future. It shows multiple server-calculated futures with evidence.',
    runDecisionTwin: 'Run three scenarios',
    twinNoAction: 'No action',
    twinBalanced: 'Balanced coverage',
    twinHighCoverage: 'High coverage',
    twinPresetsHint: 'Same product and window; 2-day lead, 7-day horizon, and 0 / 3 / 14 safety-stock days.',
    selectScenarioForReview: 'Select for review',
    selectedForReview: 'Selected for review',
    twinUnsupported: 'Decision Twin cannot be shown safely from these results.',
    twinIncoherent: 'The server results do not prove one coherent comparison.',
    scenarioNoAction: 'No action',
    scenarioBalanced: 'Balanced coverage',
    scenarioHighCoverage: 'High coverage',
    scenarioServerBacked: 'Server-backed',
    scenarioUnsupported: 'Unsupported',
    scenarioEvidenceMissing: 'Evidence is missing for a numeric result',
    selectForProposal: 'Select for proposal',
    selectedForProposal: 'Selected for proposal',
    simulationOnly: 'Simulation only',
    proofGraph: 'Interactive Proof Graph',
    proofGraphHint: 'Only relationships proven by returned IDs are shown.',
    proofGraphEmpty: 'No evidence-backed result is available to connect yet.',
    proofGraphMobileHint: 'The proof path is shown in reading order.',
    focusWorkspace: 'Focus related workspace',
    proofSourceRecords: 'Source sales, refunds, and cost snapshots',
    proofRevenueEvidence: 'Revenue evidence',
    proofRefundEvidence: 'Refund evidence',
    proofCogsEvidence: 'COGS evidence',
    proofGrossProfit: 'Verified Gross Profit',
    proofExplanation: 'Grounded explanation',
    proofSimulation: 'Reorder simulation',
    proofProposal: 'Review proposal',
    proofOwnerDecision: 'Owner decision',
    proofDraft: 'PurchaseOrder DRAFT',
    proofLedgerEvent: 'Ledger event',
    policyShield: 'Policy Shield',
    policyShieldHint: 'Always-enforced system guarantees are separated from evidence verified in this run.',
    systemPolicy: 'SYSTEM POLICY',
    currentRun: 'CURRENT RUN',
    enforcementSource: 'Enforcement source',
    policyEnforced: 'Policy enforced',
    policyVerified: 'Verified in this run',
    policyPending: 'Pending',
    policyNotObserved: 'Not observed in this run',
    policyBlocked: 'Failed closed',
    sourceBackendContract: 'Backend contract',
    sourceDatabaseConstraint: 'Database constraint',
    sourceAuthorization: 'Authorization',
    sourceAppendOnlyLedger: 'Append-only ledger',
    policyImmutableEvidence: 'Immutable evidence required',
    policyImmutableEvidenceHint: 'Business results link to immutable records through evidence IDs.',
    policyDeterministicCalculations: 'Deterministic calculations',
    policyDeterministicCalculationsHint: 'Gross Profit and inventory scenarios use versioned server-side formulas.',
    policyNumericGrounding: 'Numeric grounding required',
    policyNumericGroundingHint: 'A business number without an evidence link is not released to the user.',
    policyHumanApproval: 'Human approval required',
    policyHumanApprovalHint: 'A proposal proceeds only after an explicit decision by an authorized owner.',
    policySupplierIsolation: 'Simulation does not contact a supplier',
    policySupplierIsolationHint: 'Simulation and proposal creation perform no external communication.',
    policyNoPayment: 'Payment is not initiated',
    policyNoPaymentHint: 'The approval path does not initiate a payment operation.',
    policyNoInventoryMutation: 'Inventory is unchanged',
    policyNoInventoryMutationHint: 'Simulation, proposal, and DRAFT do not alter current inventory.',
    policyOneDraft: 'Maximum one PurchaseOrder DRAFT',
    policyOneDraftHint: 'The idempotent decision contract blocks duplicate DRAFTs for one proposal.',
    policyZeroSpend: 'Autonomous spend: 0 UZS',
    policyZeroSpendHint: 'This is a human-approval system policy, not a calculated financial metric.',
    policyTenantIsolation: 'Tenant isolation enforced',
    policyTenantIsolationHint: 'The server scopes every request through store context and authorization.',
    primaryBusinessAnswer: 'Primary business answer',
    verifiedFacts: 'Evidence-backed facts',
    technicalMetadata: 'Technical metadata',
    approvalCreatesOneDraft: 'Approval creates at most one PurchaseOrder DRAFT.',
  }),
});

const SAVDOGRAPH_TEXT = Object.freeze({
  UZ: Object.freeze({ ...TEXT.UZ, ...EXPERIENCE_TEXT.UZ, ...REDESIGN_TEXT.UZ }),
  RU: Object.freeze({ ...TEXT.RU, ...EXPERIENCE_TEXT.RU, ...REDESIGN_TEXT.RU }),
  EN: Object.freeze({ ...TEXT.EN, ...EXPERIENCE_TEXT.EN, ...REDESIGN_TEXT.EN }),
});

const SAVDOGRAPH_TEXT_KEYS = Object.freeze({
  UZ: Object.freeze(Object.keys(SAVDOGRAPH_TEXT.UZ).sort()),
  RU: Object.freeze(Object.keys(SAVDOGRAPH_TEXT.RU).sort()),
  EN: Object.freeze(Object.keys(SAVDOGRAPH_TEXT.EN).sort()),
});

const CYRILLIC_PRESERVED_TOKENS = Object.freeze([
  'SavdoGraph', 'GPT-5.6', 'PurchaseOrder', 'DRAFT', 'Asia/Tashkent', 'UZS', 'COGS',
  'totalUzs', 'refundedTotalUzs', 'costAtSaleUzs', 'Sale', 'LEGACY_OR_UNKNOWN',
  'max(0, ceil(netUnitsSold/lookbackDays * (leadTimeDays + safetyStockDays + forecastHorizonDays) - currentOnHand))',
]);

function toSavdoGraphCyrillic(value) {
  let protectedValue = String(value);
  const placeholders = [];
  for (const token of CYRILLIC_PRESERVED_TOKENS) {
    if (!protectedValue.includes(token)) continue;
    const marker = String.fromCodePoint(0xE000 + placeholders.length);
    protectedValue = protectedValue.split(token).join(marker);
    placeholders.push([marker, token]);
  }
  let result = toCyrillic(protectedValue);
  for (const [marker, token] of placeholders) result = result.split(marker).join(token);
  return result;
}

export function savdoGraphLocaleFromLanguage(language) {
  return WORKSPACE_LOCALE_BY_GLOBAL_LANGUAGE[language] || 'UZ';
}

export function askLocaleFromLanguage(language) {
  return ASK_LOCALE_BY_GLOBAL_LANGUAGE[language] || 'UZ';
}

export function savdoGraphTextKeys(locale = 'UZ') {
  const resolved = WORKSPACE_LOCALES.includes(locale) ? locale : 'UZ';
  return SAVDOGRAPH_TEXT_KEYS[resolved === 'UZC' ? 'UZ' : resolved];
}

export function sgText(locale, key) {
  const resolved = WORKSPACE_LOCALES.includes(locale) ? locale : 'UZ';
  const sourceLocale = resolved === 'UZC' ? 'UZ' : resolved;
  const value = SAVDOGRAPH_TEXT[sourceLocale]?.[key];
  if (value === undefined) return key;
  return resolved === 'UZC' ? toSavdoGraphCyrillic(value) : value;
}

const LEDGER_PRESENTATION_KEYS = Object.freeze({
  PROPOSAL_CREATED_FROM_REORDER_SIMULATION: Object.freeze({ event: 'ledgerEventProposalCreated', outcome: 'ledgerOutcomeAwaitingReview', detail: 'ledgerDetailProposalCreated' }),
  PROPOSAL_APPROVED: Object.freeze({ event: 'ledgerEventProposalApproved', outcome: 'ledgerOutcomeApproved', detail: 'ledgerDetailProposalApproved' }),
  PROPOSAL_REJECTED: Object.freeze({ event: 'ledgerEventProposalRejected', outcome: 'ledgerOutcomeRejected', detail: 'ledgerDetailProposalRejected' }),
  DRAFT_PURCHASE_ORDER_CREATED: Object.freeze({ event: 'ledgerEventDraftCreated', outcome: 'ledgerOutcomeDraftCreated', detail: 'ledgerDetailDraftCreated' }),
  IDEMPOTENT_REPLAY: Object.freeze({ event: 'ledgerEventIdempotentReplay', outcome: 'ledgerOutcomeReplayed', detail: 'ledgerDetailIdempotentReplay' }),
});

const LEDGER_PRESENTATION_FALLBACK = Object.freeze({
  event: 'ledgerEventUnknown', outcome: 'ledgerOutcomeUnknown', detail: 'ledgerDetailUnknown',
});

export function presentLedgerEvent(event, locale = 'UZ') {
  const eventType = typeof event === 'string' ? event : event?.eventType;
  const keys = typeof eventType === 'string'
    ? LEDGER_PRESENTATION_KEYS[eventType.trim().toUpperCase()] || LEDGER_PRESENTATION_FALLBACK
    : LEDGER_PRESENTATION_FALLBACK;
  return {
    eventLabel: sgText(locale, keys.event),
    outcomeLabel: sgText(locale, keys.outcome),
    actorLabel: sgText(locale, 'ledgerActorAuthorized'),
    detail: sgText(locale, keys.detail),
  };
}

const BRIEF_NARRATIVE_KEYS = Object.freeze({
  'Sale date is start-inclusive and end-exclusive in Asia/Tashkent.': 'briefAssumptionPeriod',
  'Revenue is the as-of snapshot totalUzs minus refundedTotalUzs.': 'briefAssumptionRevenueSnapshot',
  'Credit sales are included because persisted Sale is the booked checkout record.': 'briefAssumptionCreditSales',
  'Currency provenance is missing, mixed, or not UZS-canonical; no aggregate is presented.': 'briefLimitationCurrency',
  'At least one sale item has no transaction-time costAtSaleUzs; current product cost is never used.': 'briefLimitationMissingCost',
  'A refunded quantity is outside its sold quantity; COGS cannot be trusted.': 'briefLimitationRefundQuantity',
  'At least one cost snapshot is LEGACY_OR_UNKNOWN and is therefore estimated, not verified.': 'briefLimitationLegacyCost',
});

export function briefNarrativeText(value, locale = 'UZ') {
  if (typeof value !== 'string' || value !== value.trim()) return sgText(locale, 'briefNarrativeUnavailable');
  return sgText(locale, BRIEF_NARRATIVE_KEYS[value] || 'briefNarrativeUnavailable');
}

const SIMULATION_RISK_LABEL_KEYS = Object.freeze({
  ESTIMATED_STOCKOUT_BEFORE_LEAD_TIME: 'simulationRiskStockoutBeforeLead',
  NO_STOCKOUT_WITHIN_ASSUMED_LEAD_TIME: 'simulationRiskNoStockoutWithinLead',
  ESTIMATED_ABOVE_SCENARIO_TARGET: 'simulationRiskAboveTarget',
  NO_SCENARIO_OVERSTOCK: 'simulationRiskNoOverstock',
  NO_OBSERVED_SALES: 'simulationRiskNoObservedSales',
  NO_OBSERVED_SALES_IN_LOOKBACK: 'simulationRiskNoObservedSales',
  INSUFFICIENT_DATA: 'simulationRiskInsufficient',
  INSUFFICIENT_DATA_NEGATIVE_ON_HAND: 'simulationRiskNegativeOnHand',
  INSUFFICIENT_DATA_PRODUCT_UNIT_OR_CURRENCY_OR_RETURN_QUANTITY: 'simulationRiskInvalidProductData',
  INSUFFICIENT_DATA_SCENARIO_QUANTITY_EXCEEDS_SAFE_LIMIT: 'simulationRiskExceedsSafeLimit',
  LOW: 'simulationRiskLow',
  HIGH: 'simulationRiskHigh',
});

export function simulationRiskLabel(value, locale = 'UZ') {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return sgText(locale, SIMULATION_RISK_LABEL_KEYS[normalized] || 'simulationValueUnavailable');
}

const SIMULATION_FIXED_NARRATIVE_KEYS = Object.freeze({
  'Formula: max(0, ceil(netUnitsSold/lookbackDays * (leadTimeDays + safetyStockDays + forecastHorizonDays) - currentOnHand)).': 'simulationFormula',
  'No reserved stock, incoming purchase order, supplier delivery, or cross-unit conversion is claimed.': 'simulationLimitationOperations',
  'Tied-up capital is unavailable because current on-hand inventory has no immutable lot-cost provenance.': 'simulationLimitationLotCost',
});

const SIMULATION_DYNAMIC_NARRATIVES = Object.freeze([
  Object.freeze({ pattern: /^Lead time is an owner-visible scenario assumption: (\d+) days\.$/, min: 0, max: 60, key: 'simulationAssumptionLeadTime' }),
  Object.freeze({ pattern: /^Safety stock is an owner-visible scenario assumption: (\d+) days\.$/, min: 0, max: 90, key: 'simulationAssumptionSafetyStock' }),
  Object.freeze({ pattern: /^Forecast horizon is an owner-visible scenario assumption: (\d+) days\.$/, min: 1, max: 180, key: 'simulationAssumptionForecastHorizon' }),
]);

export function simulationNarrativeText(value, locale = 'UZ') {
  if (typeof value !== 'string' || value !== value.trim()) return sgText(locale, 'simulationValueUnavailable');
  const fixedKey = SIMULATION_FIXED_NARRATIVE_KEYS[value];
  if (fixedKey) return sgText(locale, fixedKey);
  for (const { pattern, min, max, key } of SIMULATION_DYNAMIC_NARRATIVES) {
    const match = pattern.exec(value);
    if (!match) continue;
    const days = Number(match[1]);
    if (!Number.isInteger(days) || days < min || days > max) break;
    return sgText(locale, key).replace('{0}', String(days));
  }
  return sgText(locale, 'simulationValueUnavailable');
}

export function formatSavdoGraphDateTime(value, locale = 'UZ') {
  if (!value) return '';
  const text = String(value);
  const localDateTime = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?)(?:\.(\d+))?$/.exec(text);
  const normalized = localDateTime
    ? `${localDateTime[1]}${localDateTime[2] ? `.${localDateTime[2].slice(0, 3).padEnd(3, '0')}` : ''}+05:00`
    : text;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(INTL_LOCALE_BY_WORKSPACE[locale] || INTL_LOCALE_BY_WORKSPACE.UZ, {
    dateStyle: 'medium', timeStyle: 'short', timeZone: SAVDOGRAPH_TIMEZONE,
  }).format(date);
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
    GROUNDEDNESS_VALIDATION_FAILED: 'groundednessFailure', PENDING: 'pending', PROPOSED: 'pending',
    APPROVED: 'approved', DRAFT_CREATED: 'approved', REJECTED: 'rejected',
  };
  return sgText(locale, labels[String(status || '').toUpperCase()] || 'error');
}

const MAX_ASK_TOOLS = 5;
const MAX_ASK_TOOL_NAME_LENGTH = 64;

function isNumericFactValue(value) {
  if (typeof value === 'number') return true;
  if (typeof value !== 'string') return false;
  let candidate = value.trim();
  if (/^\(.+\)$/.test(candidate)) candidate = candidate.slice(1, -1).trim();
  candidate = candidate.replace(/^(?:about|approximately|around|taxminan|около|примерно)\s+/iu, '');
  candidate = candidate.replace(/^[A-Z]{3}\s+/, '');
  return /^[+-]?(?:(?:\d{1,3}(?:[ ,]\d{3})+|\d+)(?:[.,]\d+)?|[.,]\d+)(?:\s*(?:%|\p{L}{1,16}(?:\/\p{L}{1,16})?))?$/u.test(candidate);
}

function hasAnsweredGroundingContract(response) {
  const tools = response.toolsUsed;
  if (!Array.isArray(tools) || tools.length === 0 || tools.length > MAX_ASK_TOOLS
    || tools.some((tool) => typeof tool !== 'string'
      || tool.length === 0
      || tool.length > MAX_ASK_TOOL_NAME_LENGTH
      || tool !== tool.trim())) return false;
  const resultEvidence = evidenceIdList(response.evidenceIds);
  if (resultEvidence.length === 0) return false;
  const resultEvidenceSet = new Set(resultEvidence);
  const allowedFactClassifications = response.classification === 'VERIFIED'
    ? new Set(['VERIFIED']) : new Set(['VERIFIED', 'ESTIMATED']);

  const facts = Array.isArray(response.facts) ? response.facts : [];
  return facts.every((fact) => {
    if (!fact || typeof fact !== 'object' || Array.isArray(fact)) return false;
    const factEvidence = evidenceIdList(fact.evidence_ids ?? fact.evidenceIds);
    if (factEvidence.length === 0 || factEvidence.some((id) => !resultEvidenceSet.has(id))) return false;
    if (!allowedFactClassifications.has(fact.classification)) return false;
    return !isNumericFactValue(fact.value) || factEvidence.length > 0;
  });
}

export function normaliseAskResponse(response) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) return null;
  const status = response.status;
  const allowedClassifications = ASK_CLASSIFICATIONS_BY_STATUS[status];
  if (!allowedClassifications) return null;

  const classification = response.classification == null ? null : response.classification;
  if (!allowedClassifications.has(classification)) return null;
  if (status === 'ANSWERED' && (
    !classification
    || typeof response.answer !== 'string'
    || !response.answer.trim()
    || !hasAnsweredGroundingContract(response)
  )) return null;

  return Object.fromEntries(ASK_RESPONSE_FIELDS
    .filter((field) => Object.prototype.hasOwnProperty.call(response, field))
    .map((field) => [field, response[field]]));
}

function safeNarrativeList(value, translate) {
  return (Array.isArray(value) ? value : [])
    .filter((item) => typeof item === 'string')
    .slice(0, 30)
    .map((item) => translate(item.slice(0, 1000)));
}

function safeAskFacts(value, translate) {
  return (Array.isArray(value) ? value : []).slice(0, 30)
    .filter((fact) => fact && typeof fact === 'object' && !Array.isArray(fact))
    .map((fact) => {
      const safe = {};
      if (typeof fact.label === 'string') safe.label = translate(fact.label.slice(0, 500));
      if (typeof fact.value === 'string' || (typeof fact.value === 'number' && Number.isFinite(fact.value))) safe.value = fact.value;
      if (typeof fact.unit === 'string') safe.unit = fact.unit.slice(0, 40);
      const ids = evidenceIdList(fact.evidence_ids ?? fact.evidenceIds);
      if (Object.prototype.hasOwnProperty.call(fact, 'evidence_ids')) safe.evidence_ids = ids;
      else if (Object.prototype.hasOwnProperty.call(fact, 'evidenceIds')) safe.evidenceIds = ids;
      if (['VERIFIED', 'ESTIMATED', 'INSUFFICIENT_DATA', 'UNSUPPORTED'].includes(fact.classification)) {
        safe.classification = fact.classification;
      }
      return safe;
    });
}

function safeSuggestedActions(value, translate) {
  return (Array.isArray(value) ? value : []).slice(0, 20)
    .filter((action) => action && typeof action === 'object' && !Array.isArray(action))
    .map((action) => {
      const safe = {};
      if (typeof action.type === 'string') safe.type = action.type.slice(0, 80);
      if (typeof action.label === 'string') safe.label = translate(action.label.slice(0, 500));
      if (typeof action.requires_human_action === 'boolean') safe.requires_human_action = action.requires_human_action;
      if (typeof action.requiresHumanAction === 'boolean') safe.requiresHumanAction = action.requiresHumanAction;
      return safe;
    });
}

export function localizeAskResponseForPresentation(response, locale = 'UZ') {
  const normalized = normaliseAskResponse(response);
  if (!normalized) return null;
  const resolvedLocale = WORKSPACE_LOCALES.includes(locale) ? locale : 'UZ';
  const expectedLanguage = resolvedLocale === 'UZC' ? 'UZ' : resolvedLocale;
  const returnedLanguage = typeof normalized.language === 'string' ? normalized.language.toUpperCase() : '';
  if (normalized.status === 'ANSWERED' && returnedLanguage !== expectedLanguage) return null;
  const shouldTransliterate = resolvedLocale === 'UZC' && returnedLanguage === 'UZ';
  const translate = (value) => shouldTransliterate ? toSavdoGraphCyrillic(value) : value;
  const localized = { ...normalized };

  if (typeof normalized.answer === 'string') localized.answer = translate(normalized.answer.slice(0, 5000));
  if (Object.prototype.hasOwnProperty.call(normalized, 'facts')) localized.facts = safeAskFacts(normalized.facts, translate);
  if (Object.prototype.hasOwnProperty.call(normalized, 'assumptions')) localized.assumptions = safeNarrativeList(normalized.assumptions, translate);
  if (Object.prototype.hasOwnProperty.call(normalized, 'limitations')) localized.limitations = safeNarrativeList(normalized.limitations, translate);
  if (Object.prototype.hasOwnProperty.call(normalized, 'toolsUsed')) {
    localized.toolsUsed = (Array.isArray(normalized.toolsUsed) ? normalized.toolsUsed : [])
      .filter((tool) => typeof tool === 'string').slice(0, 10).map((tool) => tool.slice(0, 120));
  }
  if (Object.prototype.hasOwnProperty.call(normalized, 'evidenceIds')) localized.evidenceIds = evidenceIdList(normalized.evidenceIds);
  if (Object.prototype.hasOwnProperty.call(normalized, 'suggestedNextActions')) {
    localized.suggestedNextActions = safeSuggestedActions(normalized.suggestedNextActions, translate);
  }
  return localized;
}

export function decisionEvidenceIds(...sources) {
  const ids = [];
  for (const source of sources.flat()) {
    if (!source || typeof source !== 'object') continue;
    ids.push(...evidenceIdList(source.evidenceIds));
    ids.push(...parseEvidenceReferences(source.evidenceReferences));
    for (const fact of Array.isArray(source.facts) ? source.facts : []) {
      ids.push(...evidenceIdList(fact?.evidence_ids ?? fact?.evidenceIds));
    }
  }
  return [...new Set(ids)];
}

export function buildDecisionTrace(response) {
  if (!response || typeof response !== 'object') return [];
  const tools = Array.isArray(response.toolsUsed) ? response.toolsUsed.filter(Boolean) : [];
  const evidence = decisionEvidenceIds(response);
  const status = String(response.status || '').toUpperCase();
  const isAnswered = status === 'ANSWERED';
  const isGroundingFailure = status === 'GROUNDEDNESS_VALIDATION_FAILED';
  const isTerminalFailure = ['PROVIDER_UNAVAILABLE', 'REFUSED', 'ERROR'].includes(status);

  let toolState = tools.length > 0 ? 'complete' : 'current';
  let evidenceState = tools.length > 0 ? (evidence.length > 0 ? 'complete' : 'current') : 'not_started';
  let groundingState = evidence.length > 0 ? 'current' : 'not_started';
  let classificationState = 'not_started';
  let releaseState = 'not_started';

  if (isGroundingFailure) {
    toolState = tools.length > 0 ? 'complete' : 'not_started';
    evidenceState = evidence.length > 0 ? 'complete' : 'not_started';
    groundingState = 'blocked';
  } else if (isTerminalFailure) {
    toolState = tools.length > 0 ? 'complete' : 'blocked';
    evidenceState = evidence.length > 0 ? 'complete' : 'not_started';
    groundingState = 'not_started';
    releaseState = 'blocked';
  } else if (isAnswered) {
    if (tools.length === 0) {
      toolState = 'blocked';
      evidenceState = 'not_started';
    } else if (evidence.length === 0) {
      evidenceState = 'blocked';
    } else {
      groundingState = 'complete';
      classificationState = response.classification ? 'complete' : 'blocked';
      releaseState = classificationState === 'complete' ? 'complete' : 'not_started';
    }
  }

  return [
    { key: 'traceQuestionReceived', state: 'complete', detail: response.interactionId || null },
    { key: 'traceToolSelected', state: toolState, detail: tools[0] || null },
    { key: 'traceEvidenceLoaded', state: evidenceState, detail: evidence.length || null },
    { key: 'traceGroundingChecked', state: groundingState, detail: status || null },
    { key: 'traceClassificationPreserved', state: classificationState, detail: classificationState === 'complete' ? response.classification : null },
    { key: 'traceAnswerReleased', state: releaseState, detail: releaseState === 'complete' ? status : null },
  ];
}
const DECISION_TWIN_PRESETS = Object.freeze([
  Object.freeze({ key: 'NO_ACTION', safetyStockDays: 0 }),
  Object.freeze({ key: 'BALANCED', safetyStockDays: 3 }),
  Object.freeze({ key: 'HIGH_COVERAGE', safetyStockDays: 14 }),
]);
const DECISION_TWIN_LEAD_DAYS = 2;
const DECISION_TWIN_HORIZON_DAYS = 7;
const DECISION_TWIN_STOCKOUT_RISKS = new Set([
  'ESTIMATED_STOCKOUT_BEFORE_LEAD_TIME', 'NO_STOCKOUT_WITHIN_ASSUMED_LEAD_TIME',
  'NO_OBSERVED_SALES', 'INSUFFICIENT_DATA',
]);
const DECISION_TWIN_OVERSTOCK_RISKS = new Set([
  'ESTIMATED_ABOVE_SCENARIO_TARGET', 'NO_SCENARIO_OVERSTOCK', 'INSUFFICIENT_DATA',
]);
const DECISION_TWIN_EVIDENCE_KEYS = Object.freeze([
  'periodTimezone', 'currentStock', 'netUnitsSold', 'velocity', 'reorderQuantity',
  'coverageBefore', 'coverageAfter', 'stockoutRisk', 'overstockRisk', 'tiedUpCapital', 'classification',
]);
const DECISION_TWIN_REQUEST_FIELDS = Object.freeze([
  'forecastHorizonDays', 'leadTimeDays', 'lookbackEnd', 'lookbackStart', 'productId', 'safetyStockDays',
]);
const SAFE_SIMULATION_FIELDS = Object.freeze([
  'analysisRunId', 'classification', 'productId', 'productSku', 'unit', 'currentOnHandQuantity',
  'lookbackStart', 'lookbackEnd', 'netUnitsSold', 'velocityUnitsPerDay', 'leadTimeDays',
  'safetyStockDays', 'forecastHorizonDays', 'reorderQuantity', 'coverageBeforeDays',
  'coverageAfterDays', 'stockoutRisk', 'overstockRisk', 'tiedUpCapitalUzs',
  'tiedUpCapitalState', 'assumptions', 'risks', 'limitations', 'calculationId',
  'calculationVersion', 'generatedAt', 'evidenceIds',
]);

function positiveInteger(value) {
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : null;
}

function safeSimulationSnapshot(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null;
  const safe = {};
  for (const field of SAFE_SIMULATION_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(result, field)) continue;
    if (['assumptions', 'risks', 'limitations'].includes(field)) {
      safe[field] = (Array.isArray(result[field]) ? result[field] : [])
        .filter((item) => typeof item === 'string').slice(0, 30).map((item) => item.slice(0, 1000));
    } else if (field === 'evidenceIds') {
      safe.evidenceIds = Object.fromEntries(Object.entries(result.evidenceIds || {})
        .filter(([key, id]) => DECISION_TWIN_EVIDENCE_KEYS.includes(key) && positiveInteger(id))
        .map(([key, id]) => [key, Number(id)]));
    } else if (typeof result[field] === 'string') {
      safe[field] = result[field].slice(0, 500);
    } else {
      safe[field] = result[field];
    }
  }
  return safe;
}

function failedDecisionTwin(reason) {
  return {
    coherent: false,
    scenarios: DECISION_TWIN_PRESETS.map(({ key }) => ({ key, result: null, supported: false, reason })),
    reason,
  };
}

function safeDecisionTwinRequest(request, preset) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) return null;
  const keys = Object.keys(request).sort();
  if (keys.length !== DECISION_TWIN_REQUEST_FIELDS.length
    || keys.some((key, index) => key !== DECISION_TWIN_REQUEST_FIELDS[index])) return null;
  const normalized = {
    productId: positiveInteger(request.productId),
    lookbackStart: request.lookbackStart,
    lookbackEnd: request.lookbackEnd,
    leadTimeDays: Number(request.leadTimeDays),
    safetyStockDays: Number(request.safetyStockDays),
    forecastHorizonDays: Number(request.forecastHorizonDays),
  };
  if (!normalized.productId
    || !validateSimulationInput(normalized)
    || normalized.leadTimeDays !== DECISION_TWIN_LEAD_DAYS
    || normalized.safetyStockDays !== preset.safetyStockDays
    || normalized.forecastHorizonDays !== DECISION_TWIN_HORIZON_DAYS) return null;
  return normalized;
}

function isDecisionTwinText(value, maxLength) {
  return typeof value === 'string' && value === value.trim() && value.length > 0 && value.length <= maxLength;
}

function isDecisionTwinNonNegativeNumber(value) {
  return value !== null && value !== undefined && value !== ''
    && Number.isFinite(Number(value)) && Number(value) >= 0;
}

export function buildDecisionTwinRequests({ productId, lookbackStart, lookbackEnd } = {}) {
  const normalizedProductId = positiveInteger(productId);
  if (!normalizedProductId || !validatePeriod(lookbackStart, lookbackEnd, 90)) {
    throw new TypeError('Decision Twin requires a positive productId and a 1..90 day exclusive lookback window');
  }
  return DECISION_TWIN_PRESETS.map(({ key, safetyStockDays }) => ({
    key,
    request: {
      productId: normalizedProductId,
      lookbackStart,
      lookbackEnd,
      leadTimeDays: DECISION_TWIN_LEAD_DAYS,
      safetyStockDays,
      forecastHorizonDays: DECISION_TWIN_HORIZON_DAYS,
    },
  }));
}

export function validateDecisionTwin(results) {
  if (!Array.isArray(results) || results.length !== DECISION_TWIN_PRESETS.length) {
    return failedDecisionTwin('INVALID_RESULT_COUNT');
  }
  const byKey = new Map();
  for (const entry of results) {
    const preset = DECISION_TWIN_PRESETS.find(({ key }) => key === entry?.key);
    if (!entry || typeof entry !== 'object' || !preset || byKey.has(entry.key)) {
      return failedDecisionTwin('INVALID_SCENARIO_KEY');
    }
    const request = safeDecisionTwinRequest(entry.request, preset);
    if (!request) return failedDecisionTwin('SCENARIO_REQUEST_MISMATCH');
    byKey.set(entry.key, { request, result: safeSimulationSnapshot(entry.result) });
  }
  const ordered = DECISION_TWIN_PRESETS.map(({ key, safetyStockDays }) => {
    const entry = byKey.get(key);
    return { key, safetyStockDays, request: entry?.request, result: entry?.result };
  });
  if (ordered.some(({ result }) => !result)) return failedDecisionTwin('INVALID_RESULT');

  const analysisRunIds = new Set();
  const observedEvidenceIds = new Set();
  for (const { safetyStockDays, request, result } of ordered) {
    const runId = positiveInteger(result.analysisRunId);
    if (!runId || analysisRunIds.has(runId)) return failedDecisionTwin('INVALID_ANALYSIS_RUN');
    analysisRunIds.add(runId);
    if (positiveInteger(result.productId) !== request.productId
      || String(result.lookbackStart || '') !== request.lookbackStart
      || String(result.lookbackEnd || '') !== request.lookbackEnd
      || Number(result.leadTimeDays) !== request.leadTimeDays
      || Number(result.safetyStockDays) !== request.safetyStockDays
      || Number(result.forecastHorizonDays) !== request.forecastHorizonDays) {
      return failedDecisionTwin('SCENARIO_REQUEST_RESULT_MISMATCH');
    }
    if (!isDecisionTwinNonNegativeNumber(result.coverageAfterDays)) {
      return failedDecisionTwin('COVERAGE_AFTER_UNAVAILABLE');
    }
    if (result.classification !== 'ESTIMATED'
      || Number(result.leadTimeDays) !== DECISION_TWIN_LEAD_DAYS
      || Number(result.safetyStockDays) !== safetyStockDays
      || Number(result.forecastHorizonDays) !== DECISION_TWIN_HORIZON_DAYS
      || !validatePeriod(result.lookbackStart, result.lookbackEnd, 90)
      || !isDecisionTwinText(result.productSku, 128)
      || !isDecisionTwinText(result.unit, 32)
      || !isDecisionTwinNonNegativeNumber(result.currentOnHandQuantity)
      || !isDecisionTwinNonNegativeNumber(result.netUnitsSold)
      || !isDecisionTwinNonNegativeNumber(result.velocityUnitsPerDay)
      || !isDecisionTwinNonNegativeNumber(result.coverageBeforeDays)
      || result.tiedUpCapitalUzs !== null
      || result.tiedUpCapitalState !== 'UNAVAILABLE_NO_LOT_COST_PROVENANCE'
      || !DECISION_TWIN_STOCKOUT_RISKS.has(result.stockoutRisk)
      || !DECISION_TWIN_OVERSTOCK_RISKS.has(result.overstockRisk)
      || !Number.isInteger(Number(result.reorderQuantity))
      || Number(result.reorderQuantity) < 0
      || Number(result.reorderQuantity) > 100000) {
      return failedDecisionTwin('SCENARIO_CONTRACT_MISMATCH');
    }
    if (DECISION_TWIN_EVIDENCE_KEYS.some((key) => !positiveInteger(result.evidenceIds?.[key]))) {
      return failedDecisionTwin('SCENARIO_EVIDENCE_INCOMPLETE');
    }
    const scenarioEvidenceIds = DECISION_TWIN_EVIDENCE_KEYS.map((key) => positiveInteger(result.evidenceIds[key]));
    if (new Set(scenarioEvidenceIds).size !== scenarioEvidenceIds.length
      || scenarioEvidenceIds.some((id) => observedEvidenceIds.has(id))) {
      return failedDecisionTwin('SCENARIO_EVIDENCE_NOT_DISTINCT');
    }
    for (const id of scenarioEvidenceIds) observedEvidenceIds.add(id);
  }

  const sharedFields = [
    'productId', 'productSku', 'unit', 'lookbackStart', 'lookbackEnd', 'currentOnHandQuantity',
    'netUnitsSold', 'velocityUnitsPerDay', 'coverageBeforeDays', 'calculationId', 'calculationVersion',
  ];
  const baseline = ordered[0].result;
  if (sharedFields.some((field) => ordered.slice(1)
    .some(({ result }) => String(result[field] ?? '') !== String(baseline[field] ?? '')))) {
    return failedDecisionTwin('INCOHERENT_SNAPSHOTS');
  }
  if (Number(baseline.reorderQuantity) !== 0 || !positiveInteger(baseline.evidenceIds?.reorderQuantity)) {
    return failedDecisionTwin('NO_ACTION_NOT_SUPPORTED');
  }
  const balanced = ordered[1].result;
  const highCoverage = ordered[2].result;
  if (Number(balanced.reorderQuantity) <= 0) {
    return failedDecisionTwin('BALANCED_REORDER_NOT_POSITIVE');
  }
  if (Number(highCoverage.reorderQuantity) < Number(balanced.reorderQuantity)) {
    return failedDecisionTwin('HIGH_REORDER_BELOW_BALANCED');
  }
  const balancedCoverage = balanced.coverageAfterDays;
  const highCoverageDays = highCoverage.coverageAfterDays;
  if (balancedCoverage === null || balancedCoverage === undefined || balancedCoverage === ''
    || highCoverageDays === null || highCoverageDays === undefined || highCoverageDays === ''
    || !Number.isFinite(Number(balancedCoverage)) || !Number.isFinite(Number(highCoverageDays))) {
    return failedDecisionTwin('COVERAGE_AFTER_UNAVAILABLE');
  }
  if (Number(highCoverageDays) <= Number(balancedCoverage)) {
    return failedDecisionTwin('HIGH_COVERAGE_NOT_ABOVE_BALANCED');
  }

  return {
    coherent: true,
    scenarios: ordered.map(({ key, request, result }) => ({ key, request, result, supported: true })),
    reason: null,
  };
}

const PROOF_EVIDENCE_LABEL_KEYS = Object.freeze({
  sourceRecordCounts: 'proofSourceRecords',
  revenue: 'proofRevenueEvidence',
  refundedRevenue: 'proofRefundEvidence',
  cogs: 'proofCogsEvidence',
  grossProfit: 'proofGrossProfit',
});

function safeInteractionId(value) {
  const text = String(value || '');
  return /^[A-Za-z0-9._-]{1,64}$/.test(text) ? text : null;
}

function safeModelIdentifier(value) {
  if (typeof value !== 'string' || value !== value.trim()) return null;
  return /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,63}$/.test(value) ? value : null;
}

function graphSimulationList(simulations) {
  return (Array.isArray(simulations) ? simulations : [])
    .map((entry) => entry?.result ?? entry)
    .filter((entry) => entry && typeof entry === 'object');
}

function evidenceEntries(source) {
  if (Array.isArray(source)) return evidenceIdList(source).map((id) => [null, id]);
  if (!source || typeof source !== 'object') return [];
  return Object.entries(source)
    .map(([key, value]) => [key, positiveInteger(value)])
    .filter(([, id]) => id);
}

function sameEvidenceIdSet(left, right) {
  const leftIds = new Set(evidenceIdList(left));
  const rightIds = new Set(evidenceIdList(right));
  if (leftIds.size === 0 || leftIds.size !== rightIds.size) return false;
  return [...leftIds].every((id) => rightIds.has(id));
}

export function buildProofGraph({ brief, askResponse, simulations, proposal, decision, ledger } = {}) {
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();
  const edgeIds = new Set();
  const addNode = (node) => {
    if (!node?.id || nodeIds.has(node.id)) return;
    nodeIds.add(node.id);
    nodes.push(node);
  };
  const addEdge = (from, to, kind) => {
    if (!nodeIds.has(from) || !nodeIds.has(to)) return;
    const id = from + '->' + to + ':' + kind;
    if (edgeIds.has(id)) return;
    edgeIds.add(id);
    edges.push({ id, from, to, kind });
  };
  const addEvidence = (id, evidenceKey = null) => {
    const numericId = positiveInteger(id);
    if (!numericId) return null;
    const nodeId = 'evidence:' + numericId;
    addNode({
      id: nodeId,
      kind: 'evidence',
      kindKey: 'evidence',
      labelKey: PROOF_EVIDENCE_LABEL_KEYS[evidenceKey] || 'evidence',
      referenceId: numericId,
      evidenceId: numericId,
      action: { kind: 'open-evidence', evidenceId: numericId },
    });
    return nodeId;
  };

  const briefRunId = positiveInteger(brief?.analysisRunId);
  const briefEvidence = new Map(evidenceEntries(brief?.evidenceIds));
  const exactGrossProfitEvidence = brief?.evidenceIds
    && !Array.isArray(brief.evidenceIds)
    && Object.prototype.hasOwnProperty.call(brief.evidenceIds, 'grossProfit')
    ? positiveInteger(brief.evidenceIds.grossProfit) : null;
  const grossProfitValue = safeNumericDisplayValue(brief?.grossProfitUzs);
  const grossProfitCurrency = typeof brief?.currency === 'string'
    && /^[A-Z]{3}$/.test(brief.currency) ? brief.currency : null;
  const hasVerifiedGrossProfit = Boolean(briefRunId
    && brief?.classification === 'VERIFIED'
    && grossProfitValue !== null
    && grossProfitCurrency
    && exactGrossProfitEvidence);
  if (briefRunId) {
    for (const [key, id] of briefEvidence) {
      if (key !== 'grossProfit') addEvidence(id, key);
    }
    if (hasVerifiedGrossProfit) {
      const grossProfitNode = addEvidence(exactGrossProfitEvidence, 'grossProfit');
      const grossNode = nodes.find(({ id }) => id === grossProfitNode);
      if (grossNode) Object.assign(grossNode, { value: grossProfitValue, currency: grossProfitCurrency });
      for (const key of ['sourceRecordCounts', 'revenue', 'refundedRevenue', 'cogs']) {
        const sourceNode = addEvidence(briefEvidence.get(key), key);
        if (sourceNode) addEdge(sourceNode, grossProfitNode, 'calculation-input');
      }
    }
  }

  const normalizedAsk = normaliseAskResponse(askResponse);
  const interactionId = normalizedAsk?.status === 'ANSWERED' ? safeInteractionId(normalizedAsk.interactionId) : null;
  const askNode = interactionId ? 'ask:' + interactionId : null;
  const askModel = askNode ? safeModelIdentifier(normalizedAsk.model) : null;
  if (askNode) {
    addNode({
      id: askNode, kind: 'explanation', kindKey: 'evidenceBackedAnswer', labelKey: 'proofExplanation',
      referenceId: interactionId, ...(askModel ? { model: askModel } : {}), targetId: 'sg-answer-section',
      action: { kind: 'focus-workspace', target: 'sg-answer-section' },
    });
    for (const id of decisionEvidenceIds(normalizedAsk)) {
      const evidenceNode = addEvidence(id);
      if (evidenceNode) addEdge(evidenceNode, askNode, 'grounds');
    }
  }

  const simulationByRun = new Map();
  for (const simulation of graphSimulationList(simulations)) {
    const runId = positiveInteger(simulation.analysisRunId);
    const ids = evidenceIdList(simulation.evidenceIds);
    if (!runId || ids.length === 0 || simulationByRun.has(runId)) continue;
    const nodeId = 'simulation:' + runId;
    simulationByRun.set(runId, { nodeId, evidenceIds: ids, productId: positiveInteger(simulation.productId) });
    addNode({ id: nodeId, kind: 'simulation', kindKey: 'reorderSimulator', labelKey: 'proofSimulation', referenceId: runId, targetId: 'sg-simulator-section', action: { kind: 'focus-workspace', target: 'sg-simulator-section' } });
    for (const [key, id] of evidenceEntries(simulation.evidenceIds)) {
      const evidenceNode = addEvidence(id, key);
      if (evidenceNode) addEdge(evidenceNode, nodeId, 'supports');
    }
  }

  const proposalId = positiveInteger(proposal?.proposalId ?? proposal?.id);
  const proposalNode = proposalId ? 'proposal:' + proposalId : null;
  if (proposalNode) {
    addNode({ id: proposalNode, kind: 'proposal', kindKey: 'proposalReview', labelKey: 'proofProposal', referenceId: proposalId, targetId: 'sg-proposal-section', action: { kind: 'focus-workspace', target: 'sg-proposal-section' } });
    const sourceRunId = positiveInteger(proposal.sourceAnalysisRunId ?? proposal.analysisRunId);
    const sourceSimulation = simulationByRun.get(sourceRunId);
    const proposalEvidenceIds = evidenceIdList(proposal.evidenceIds);
    if (sourceSimulation
      && proposal.sourceKind === 'B2_REORDER_SIMULATION'
      && positiveInteger(proposal.productId) === sourceSimulation.productId
      && sameEvidenceIdSet(proposalEvidenceIds, sourceSimulation.evidenceIds)) {
      addEdge(sourceSimulation.nodeId, proposalNode, 'source-analysis');
    }
    for (const id of proposalEvidenceIds) {
      const evidenceNode = addEvidence(id);
      if (evidenceNode) addEdge(evidenceNode, proposalNode, 'supports');
    }
  }

  const decisionType = String(decision?.decision || '').toUpperCase();
  const decisionStatus = String(decision?.proposalStatus || '').toUpperCase();
  const decisionMatches = Boolean(proposalId
    && positiveInteger(decision?.proposalId) === proposalId
    && ['APPROVE', 'REJECT'].includes(decisionType));
  const decisionNode = decisionMatches ? 'decision:' + proposalId : null;
  if (decisionNode) {
    addNode({ id: decisionNode, kind: 'decision', kindKey: 'currentDecision', labelKey: 'proofOwnerDecision', referenceId: proposalId, targetId: 'sg-proposal-section', action: { kind: 'focus-workspace', target: 'sg-proposal-section' } });
    addEdge(proposalNode, decisionNode, 'owner-decision');
  }

  const approvedDraft = decisionMatches
    && decisionType === 'APPROVE'
    && decisionStatus === 'DRAFT_CREATED'
    ? positiveInteger(decision?.purchaseOrderId) : null;
  const draftNode = approvedDraft ? 'draft:' + approvedDraft : null;
  if (draftNode) {
    addNode({ id: draftNode, kind: 'draft', kindKey: 'draftReference', labelKey: 'proofDraft', referenceId: approvedDraft, targetId: 'sg-ledger-section', action: { kind: 'focus-workspace', target: 'sg-ledger-section' } });
    addEdge(decisionNode, draftNode, 'creates-draft');
  }

  for (const event of Array.isArray(ledger) ? ledger : []) {
    const eventId = positiveInteger(event?.id);
    if (!eventId || !proposalId || positiveInteger(event?.proposalId) !== proposalId) continue;
    const ledgerNode = 'ledger:' + eventId;
    addNode({ id: ledgerNode, kind: 'ledger', kindKey: 'actionLedger', labelKey: 'proofLedgerEvent', referenceId: eventId, targetId: 'sg-ledger-section', action: { kind: 'focus-workspace', target: 'sg-ledger-section' } });
    addEdge(proposalNode, ledgerNode, 'records-proposal');
    const eventType = String(event.eventType || '').toUpperCase();
    const recordsApprovedDecision = decisionNode
      && decisionType === 'APPROVE'
      && decisionStatus === 'DRAFT_CREATED'
      && eventType === 'PROPOSAL_APPROVED'
      && positiveInteger(event.purchaseOrderId) === approvedDraft;
    const recordsRejectedDecision = decisionNode
      && decisionType === 'REJECT'
      && decisionStatus === 'REJECTED'
      && !positiveInteger(decision?.purchaseOrderId)
      && eventType === 'PROPOSAL_REJECTED'
      && !positiveInteger(event.purchaseOrderId);
    if (recordsApprovedDecision || recordsRejectedDecision) {
      addEdge(decisionNode, ledgerNode, 'records-decision');
    }
    if (draftNode
      && positiveInteger(event.purchaseOrderId) === approvedDraft
      && eventType === 'DRAFT_PURCHASE_ORDER_CREATED') {
      addEdge(draftNode, ledgerNode, 'records-draft');
    }
    for (const id of parseEvidenceReferences(event.evidenceReferences)) {
      const evidenceNode = addEvidence(id);
      if (evidenceNode) addEdge(evidenceNode, ledgerNode, 'records-evidence');
    }
  }

  return { nodes, edges };
}

const SYSTEM_POLICY_DEFINITIONS = Object.freeze([
  Object.freeze({ key: 'immutable-evidence', labelKey: 'policyImmutableEvidence', explanationKey: 'policyImmutableEvidenceHint', sourceCategory: 'backend-contract', sourceKey: 'sourceBackendContract', focusTarget: 'sg-proof-graph' }),
  Object.freeze({ key: 'deterministic-calculations', labelKey: 'policyDeterministicCalculations', explanationKey: 'policyDeterministicCalculationsHint', sourceCategory: 'backend-contract', sourceKey: 'sourceBackendContract', focusTarget: 'sg-decision-twin' }),
  Object.freeze({ key: 'numeric-grounding', labelKey: 'policyNumericGrounding', explanationKey: 'policyNumericGroundingHint', sourceCategory: 'backend-contract', sourceKey: 'sourceBackendContract', focusTarget: 'sg-answer-section' }),
  Object.freeze({ key: 'human-approval', labelKey: 'policyHumanApproval', explanationKey: 'policyHumanApprovalHint', sourceCategory: 'authorization', sourceKey: 'sourceAuthorization', focusTarget: 'sg-proposal-section' }),
  Object.freeze({ key: 'supplier-isolation', labelKey: 'policySupplierIsolation', explanationKey: 'policySupplierIsolationHint', sourceCategory: 'backend-contract', sourceKey: 'sourceBackendContract', focusTarget: 'sg-decision-twin' }),
  Object.freeze({ key: 'no-payment', labelKey: 'policyNoPayment', explanationKey: 'policyNoPaymentHint', sourceCategory: 'backend-contract', sourceKey: 'sourceBackendContract', focusTarget: 'sg-proposal-section' }),
  Object.freeze({ key: 'no-inventory-mutation', labelKey: 'policyNoInventoryMutation', explanationKey: 'policyNoInventoryMutationHint', sourceCategory: 'backend-contract', sourceKey: 'sourceBackendContract', focusTarget: 'sg-decision-twin' }),
  Object.freeze({ key: 'one-draft', labelKey: 'policyOneDraft', explanationKey: 'policyOneDraftHint', sourceCategory: 'database-constraint', sourceKey: 'sourceDatabaseConstraint', focusTarget: 'sg-proposal-section' }),
  Object.freeze({ key: 'zero-autonomous-spend', labelKey: 'policyZeroSpend', explanationKey: 'policyZeroSpendHint', sourceCategory: 'authorization', sourceKey: 'sourceAuthorization', focusTarget: 'sg-proposal-section' }),
  Object.freeze({ key: 'tenant-isolation', labelKey: 'policyTenantIsolation', explanationKey: 'policyTenantIsolationHint', sourceCategory: 'authorization', sourceKey: 'sourceAuthorization', focusTarget: 'sg-proof-graph' }),
]);

export function buildPolicyShield({ brief, askResponse, simulations, proposal, decision, ledger } = {}) {
  const simulationList = graphSimulationList(simulations);
  const ledgerEvents = Array.isArray(ledger) ? ledger : [];
  const allEvidence = decisionEvidenceIds(brief, askResponse, simulationList, proposal, ledgerEvents);
  const deterministicArtifacts = [brief, ...simulationList].filter((item) =>
    item?.calculationId && item?.calculationVersion && evidenceIdList(item?.evidenceIds).length > 0);
  const normalizedAsk = normaliseAskResponse(askResponse);
  const grounded = normalizedAsk?.status === 'ANSWERED'
    && Boolean(normalizedAsk.classification)
    && decisionEvidenceIds(normalizedAsk).length > 0
    && Array.isArray(normalizedAsk.toolsUsed)
    && normalizedAsk.toolsUsed.length > 0;
  const proposalId = positiveInteger(proposal?.proposalId ?? proposal?.id);
  const decisionProposalMatches = Boolean(proposalId && positiveInteger(decision?.proposalId) === proposalId);
  const decisionType = String(decision?.decision || '').toUpperCase();
  const decisionStatus = String(decision?.proposalStatus || '').toUpperCase();
  const approvedDraftId = decisionProposalMatches
    && decisionType === 'APPROVE'
    && decisionStatus === 'DRAFT_CREATED'
    ? positiveInteger(decision?.purchaseOrderId) : null;
  const approvedDecision = Boolean(approvedDraftId);
  const rejectedDecision = decisionProposalMatches
    && decisionType === 'REJECT'
    && decisionStatus === 'REJECTED'
    && !positiveInteger(decision?.purchaseOrderId);
  const ownerDecisionObserved = approvedDecision || rejectedDecision;
  const currentProposalLedger = proposalId
    ? ledgerEvents.filter((event) => positiveInteger(event?.proposalId) === proposalId)
    : [];
  const draftIds = new Set([
    approvedDraftId,
    ...currentProposalLedger
      .filter((event) => String(event?.eventType || '').toUpperCase() === 'DRAFT_PURCHASE_ORDER_CREATED')
      .map((event) => positiveInteger(event?.purchaseOrderId)),
  ].filter(Boolean));
  const typedDecisionAttempt = decisionProposalMatches && ['APPROVE', 'REJECT'].includes(decisionType);
  const draftContractBlocked = draftIds.size > 1
    || (typedDecisionAttempt && !ownerDecisionObserved)
    || (approvedDecision && (draftIds.size !== 1 || !draftIds.has(approvedDraftId)))
    || (rejectedDecision && draftIds.size !== 0);
  const oneDraftVerified = ownerDecisionObserved && !draftContractBlocked;
  const statusByKey = {
    'immutable-evidence': allEvidence.length > 0 ? 'recorded' : 'not_observed',
    'deterministic-calculations': deterministicArtifacts.length > 0 ? 'recorded' : 'not_observed',
    'numeric-grounding': normalizedAsk?.status === 'GROUNDEDNESS_VALIDATION_FAILED'
      ? 'blocked' : (grounded ? 'verified' : (normalizedAsk ? 'pending' : 'not_observed')),
    'human-approval': ownerDecisionObserved ? 'verified' : (proposalId ? 'pending' : 'not_observed'),
    'supplier-isolation': 'not_observed',
    'no-payment': 'not_observed',
    'no-inventory-mutation': 'not_observed',
    'one-draft': draftContractBlocked ? 'blocked' : (oneDraftVerified ? 'verified' : (proposalId ? 'pending' : 'not_observed')),
    'zero-autonomous-spend': 'not_observed',
    'tenant-isolation': 'not_observed',
  };

  const systemPolicy = SYSTEM_POLICY_DEFINITIONS.map((item) => ({ ...item, scope: 'SYSTEM_POLICY', status: 'enforced' }));
  const currentRun = SYSTEM_POLICY_DEFINITIONS.map((item) => ({ ...item, scope: 'CURRENT_RUN', status: statusByKey[item.key] }));
  return {
    systemPolicy,
    currentRun,
    items: SYSTEM_POLICY_DEFINITIONS.map((item) => ({
      ...item,
      id: item.key,
      targetId: item.focusTarget,
      systemStatus: 'ENFORCED',
      currentRunStatus: String(statusByKey[item.key] || 'not_observed').toUpperCase(),
    })),
  };
}

export function isReviewPendingStatus(status) {
  return ['PROPOSED', 'PENDING'].includes(String(status || '').toUpperCase());
}

function safeNumericDisplayValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value !== value.trim()) return null;
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return null;
  const significantDigits = value.replace(/^-/, '').replace('.', '').replace(/^0+/, '').length;
  if (significantDigits > 15) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (!value.includes('.') && !Number.isSafeInteger(numeric)) return null;
  return numeric;
}

export function displayBackendValue(value, locale = 'UZ') {
  if (value === null || value === undefined || value === '') return sgText(locale, 'notAvailable');
  const numeric = safeNumericDisplayValue(value);
  if (numeric !== null) {
    return new Intl.NumberFormat(INTL_LOCALE_BY_WORKSPACE[locale] || INTL_LOCALE_BY_WORKSPACE.UZ, {
      maximumFractionDigits: 20,
    }).format(numeric);
  }
  return String(value);
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

const MESSAGE_KEY_BY_CODE = Object.freeze({
  'high-refund-rate': 'Qaytarish darajasi odatdagidan yuqori. Tafsilotlarni tekshiring.',
  'refund-rate': 'Qaytarish darajasi odatdagidan yuqori. Tafsilotlarni tekshiring.',
  'late-night-activity': 'Tungi vaqtda savdo faolligi aniqlandi.',
  'night-spike': 'Tungi vaqtda noodatiy savdo faolligi aniqlandi.',
  'product-spike': 'Mahsulot savdosida noodatiy o‘sish aniqlandi.',
  'till-negative': 'Kassa qoldig‘i manfiy. Balans va operatsiyalarni tekshiring.',
  'below-cost-daily': 'Tannarxdan past sotuvlar aniqlandi.',
  'large-refund': 'Odatdagidan katta qaytarish aniqlandi.',
  'cashier-anomaly': 'Kassir operatsiyalarida noodatiy holat aniqlandi.',
});

/** Keeps rich Uzbek source copy in Uzbek and uses safe catalog copy elsewhere. */
export function localizedAnomalyMessage(anomaly, language, t) {
  if (language === 'uz' && anomaly?.message) return anomaly.message;
  const key = MESSAGE_KEY_BY_CODE[String(anomaly?.code || '').toLowerCase()]
    || 'Noodatiy faoliyat aniqlandi. Tafsilotlarni tekshiring.';
  return t(key);
}

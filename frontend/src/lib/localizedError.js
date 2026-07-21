/**
 * Converts API failures into safe, application-owned copy. Backend details are
 * deliberately not echoed because they may be Uzbek or expose internal text.
 */
export function localizedErrorMessage(t, error, fallbackKey = "Amalni bajarib bo'lmadi. Qayta urinib ko'ring.") {
  const status = Number(error?.status);
  if (status === 0) return t("Server bilan bog'lanib bo'lmadi. Internet aloqasini tekshiring.");
  if (status === 400 || status === 422) return t("Kiritilgan ma'lumotlarni tekshiring.");
  if (status === 403) return t("Bu amal uchun ruxsatingiz yo'q.");
  if (status === 404) return t('So‘ralgan ma’lumot topilmadi.');
  if (status === 409) return t('Ma’lumot o‘zgargan. Sahifani yangilab, qayta urinib ko‘ring.');
  if (status === 429) return t('Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring.');
  return t(fallbackKey);
}

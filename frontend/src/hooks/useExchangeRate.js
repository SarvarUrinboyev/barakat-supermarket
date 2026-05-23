import { ExchangeRateApi } from '../api/endpoints.js';
import { useApi } from './useApi.js';

/**
 * The live USD -> UZS exchange rate as a number, or null when it could
 * not be fetched. Used by the currency toggles to convert totals.
 */
export function useExchangeRate() {
  const { data } = useApi(() => ExchangeRateApi.get(), []);
  return data && data.available ? Number(data.rate) : null;
}

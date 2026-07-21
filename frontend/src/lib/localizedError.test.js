import { describe, expect, it } from 'vitest';
import { translate } from '../i18n/i18n.js';
import { localizedAnomalyMessage } from './anomaly.js';
import { localizedErrorMessage } from './localizedError.js';

const en = (key) => translate('en', key);

describe('safe English errors for the submission routes', () => {
  it('maps transport, validation, permission, conflict, and unknown errors', () => {
    expect(localizedErrorMessage(en, { status: 0 })).toContain('internet connection');
    expect(localizedErrorMessage(en, { status: 422 })).toBe('Check the information you entered.');
    expect(localizedErrorMessage(en, { status: 403 })).toContain('permission');
    expect(localizedErrorMessage(en, { status: 409 })).toContain('Refresh the page');
    expect(localizedErrorMessage(en, new Error('PRIVATE backend detail')))
      .toBe('The action could not be completed. Please try again.');
  });

  it('does not echo backend Uzbek anomaly copy in English', () => {
    const anomaly = {
      code: 'product-spike',
      message: "'Olma Golden' bugun 18 dona sotildi — odatdagidan ko'p.",
    };
    expect(localizedAnomalyMessage(anomaly, 'en', en))
      .toBe('An unusual increase in product sales was detected.');
    expect(localizedAnomalyMessage(anomaly, 'en', en)).not.toContain('bugun');
    expect(localizedAnomalyMessage(anomaly, 'uz', (key) => key)).toBe(anomaly.message);
  });
});

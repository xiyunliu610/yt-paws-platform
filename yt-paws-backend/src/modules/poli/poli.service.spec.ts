import { PoliAttemptStatus } from '@prisma/client';
import { extractPoliToken, mapPoliProviderStatus } from './poli.service';

describe('POLi provider contract mapping', () => {
  it.each([
    ['Completed', PoliAttemptStatus.succeeded],
    ['PaymentPending', PoliAttemptStatus.payment_pending],
    ['Cancelled', PoliAttemptStatus.cancelled],
    ['Failed', PoliAttemptStatus.failed],
    ['ReceiptUnverified', PoliAttemptStatus.receipt_unverified],
    ['TimedOut', PoliAttemptStatus.timed_out],
    ['InProcess', PoliAttemptStatus.pending],
    ['FutureUndocumentedStatus', PoliAttemptStatus.pending],
  ])('maps %s without treating uncertain values as paid', (provider, local) => {
    expect(mapPoliProviderStatus(provider)).toBe(local);
  });

  it('extracts a token only from an HTTPS paywithpoli.com URL', () => {
    expect(
      extractPoliToken(
        'https://txn.apac.paywithpoli.com/?Token=official-test-token',
      ),
    ).toBe('official-test-token');
    expect(
      extractPoliToken('https://malicious.example/?Token=stolen'),
    ).toBeNull();
    expect(
      extractPoliToken('http://txn.apac.paywithpoli.com/?Token=insecure'),
    ).toBeNull();
  });
});

import { isAllowedPaymentReturnUrl } from './payments.service';

describe('payment return URL allow-list', () => {
  it('allows the owned App scheme in production', () => {
    expect(
      isAllowedPaymentReturnUrl(
        'ytpaws://stripe-redirect',
        'production',
        'https://ytpaws.example',
      ),
    ).toBe(true);
  });

  it('allows Expo development links outside production only', () => {
    expect(
      isAllowedPaymentReturnUrl(
        'exp://127.0.0.1:8081/--/stripe-redirect',
        'test',
      ),
    ).toBe(true);
    expect(
      isAllowedPaymentReturnUrl(
        'exp://127.0.0.1:8081/--/stripe-redirect',
        'production',
      ),
    ).toBe(false);
  });

  it('allows only the configured HTTPS web origin', () => {
    expect(
      isAllowedPaymentReturnUrl(
        'https://ytpaws.example/stripe-redirect',
        'production',
        'https://ytpaws.example',
      ),
    ).toBe(true);
    expect(
      isAllowedPaymentReturnUrl(
        'https://evil.example/stripe-redirect',
        'production',
        'https://ytpaws.example',
      ),
    ).toBe(false);
    expect(
      isAllowedPaymentReturnUrl(
        'javascript://stripe-redirect',
        'production',
        'https://ytpaws.example',
      ),
    ).toBe(false);
  });
});

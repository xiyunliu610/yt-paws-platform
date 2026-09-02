import { validateProductionConfig } from './production-config';

const validProduction = (): NodeJS.ProcessEnv => ({
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://example',
  JWT_SECRET: 'a-secure-production-secret-over-32-characters',
  PUBLIC_WEB_URL: 'https://api.example.com',
  SUPPORT_EMAIL: 'support@example.com',
  CORS_ORIGINS: 'https://example.com',
  RESEND_API_KEY: 're_test',
  MAIL_FROM: 'Y&T Paws <support@example.com>',
  STRIPE_SECRET_KEY: 'sk_live_example',
  STRIPE_WEBHOOK_SECRET: 'whsec_example',
  OBJECT_STORAGE_BUCKET: 'media',
  OBJECT_STORAGE_ACCESS_KEY_ID: 'key',
  OBJECT_STORAGE_SECRET_ACCESS_KEY: 'secret',
  ALERT_WEBHOOK_URL: 'https://alerts.example.com/hook',
  EXPOSE_PASSWORD_RESET_TOKEN: 'false',
});

describe('validateProductionConfig', () => {
  it('does nothing outside production', () => {
    expect(() => validateProductionConfig({ NODE_ENV: 'test' })).not.toThrow();
  });

  it('accepts a complete production configuration', () => {
    expect(() => validateProductionConfig(validProduction())).not.toThrow();
  });

  it('rejects token exposure, weak secrets, HTTP URLs and Stripe test mode', () => {
    expect(() =>
      validateProductionConfig({
        ...validProduction(),
        EXPOSE_PASSWORD_RESET_TOKEN: 'true',
      }),
    ).toThrow();
    expect(() =>
      validateProductionConfig({ ...validProduction(), JWT_SECRET: 'weak' }),
    ).toThrow();
    expect(() =>
      validateProductionConfig({
        ...validProduction(),
        PUBLIC_WEB_URL: 'http://example.com',
      }),
    ).toThrow();
    expect(() =>
      validateProductionConfig({
        ...validProduction(),
        ALERT_WEBHOOK_URL: 'http://alerts.example.com',
      }),
    ).toThrow();
    expect(() =>
      validateProductionConfig({
        ...validProduction(),
        STRIPE_SECRET_KEY: 'sk_test_example',
      }),
    ).toThrow();
    expect(() =>
      validateProductionConfig({
        ...validProduction(),
        STRIPE_SECRET_KEY: 'not-a-stripe-key',
      }),
    ).toThrow();
    expect(() =>
      validateProductionConfig({
        ...validProduction(),
        STRIPE_WEBHOOK_SECRET: 'not-a-webhook-secret',
      }),
    ).toThrow();
    expect(() =>
      validateProductionConfig({ ...validProduction(), CORS_ORIGINS: '*' }),
    ).toThrow();
    expect(() =>
      validateProductionConfig({
        ...validProduction(),
        CORS_ORIGINS: 'http://example.com',
      }),
    ).toThrow();
  });

  it('reports missing variables together', () => {
    expect(() => validateProductionConfig({ NODE_ENV: 'production' })).toThrow(
      /DATABASE_URL.*JWT_SECRET.*PUBLIC_WEB_URL/,
    );
  });
});

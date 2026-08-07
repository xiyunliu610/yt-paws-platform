const REQUIRED_PRODUCTION_VARIABLES = [
  'DATABASE_URL',
  'JWT_SECRET',
  'PUBLIC_WEB_URL',
  'SUPPORT_EMAIL',
  'CORS_ORIGINS',
  'RESEND_API_KEY',
  'MAIL_FROM',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'OBJECT_STORAGE_BUCKET',
  'OBJECT_STORAGE_PUBLIC_URL',
  'OBJECT_STORAGE_ACCESS_KEY_ID',
  'OBJECT_STORAGE_SECRET_ACCESS_KEY',
  'ALERT_WEBHOOK_URL',
] as const;

export function validateProductionConfig(env: NodeJS.ProcessEnv) {
  if (env.NODE_ENV !== 'production') return;
  if (env.EXPOSE_PASSWORD_RESET_TOKEN === 'true') {
    throw new Error(
      'EXPOSE_PASSWORD_RESET_TOKEN must never be enabled in production',
    );
  }
  const missing = REQUIRED_PRODUCTION_VARIABLES.filter(
    (key) => !env[key]?.trim(),
  );
  if (missing.length)
    throw new Error(
      `Missing required production configuration: ${missing.join(', ')}`,
    );
  if (!env.PUBLIC_WEB_URL!.startsWith('https://'))
    throw new Error('PUBLIC_WEB_URL must use HTTPS in production');
  if (!env.OBJECT_STORAGE_PUBLIC_URL!.startsWith('https://')) {
    throw new Error('OBJECT_STORAGE_PUBLIC_URL must use HTTPS in production');
  }
  if (!env.ALERT_WEBHOOK_URL!.startsWith('https://')) {
    throw new Error('ALERT_WEBHOOK_URL must use HTTPS in production');
  }
  const corsOrigins = env
    .CORS_ORIGINS!.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (
    corsOrigins.length === 0 ||
    corsOrigins.some(
      (origin) => origin === '*' || !origin.startsWith('https://'),
    )
  ) {
    throw new Error(
      'CORS_ORIGINS must contain only explicit HTTPS origins in production',
    );
  }
  if (env.JWT_SECRET!.length < 32)
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  if (!env.STRIPE_SECRET_KEY!.startsWith('sk_live_')) {
    throw new Error('Production must use a Stripe live secret key');
  }
  if (!env.STRIPE_WEBHOOK_SECRET!.startsWith('whsec_'))
    throw new Error('Invalid Stripe webhook secret');
}

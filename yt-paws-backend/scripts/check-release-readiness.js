#!/usr/bin/env node

const requiredEvidence = {
  STRIPE_LIVE_E2E_VERIFIED_AT: 'live Stripe Checkout, signed webhook and refund reconciliation evidence',
  WECHAT_LIVE_E2E_VERIFIED_AT: 'real-account WeChat QR submission and owner verification evidence',
  PUSH_DEVICE_E2E_VERIFIED_AT: 'physical iOS and Android push delivery evidence',
  SESSION_SECURITY_REVIEW: 'accepted session-revocation model or implemented per-device session evidence',
  PRIVATE_MEDIA_VERIFIED_AT: 'private-object authenticated/signed-read verification',
  ERROR_MONITORING_VERIFIED_AT: 'centralized error monitoring test-event evidence',
  PEN_TEST_REPORT: 'independent penetration-test report identifier',
  BACKUP_RESTORE_VERIFIED_AT: 'production-like database restore evidence',
  ROLLBACK_DRILL_VERIFIED_AT: 'immutable-image rollback drill evidence',
};

const missing = Object.entries(requiredEvidence)
  .filter(([name]) => !process.env[name]?.trim())
  .map(([name, description]) => `${name}: ${description}`);

if (missing.length) {
  console.error(`Production release blocked; missing evidence:\n- ${missing.join('\n- ')}`);
  process.exit(1);
}

console.log('All production release evidence gates are present.');

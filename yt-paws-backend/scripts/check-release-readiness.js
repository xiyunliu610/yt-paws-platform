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

const manifest = {};
const failures = [];
const referencePattern = /^(https:\/\/\S+|[A-Z]{2,}-\d+|[a-z]+_[A-Za-z0-9_-]{6,})$/;
for (const [name, description] of Object.entries(requiredEvidence)) {
  const raw = process.env[name]?.trim();
  if (!raw) {
    failures.push(`${name}: missing ${description}`);
    continue;
  }
  const [owner, verifiedAtRaw, expiresAtRaw, reference] = raw.split('|');
  const verifiedAt = new Date(verifiedAtRaw);
  const expiresAt = new Date(expiresAtRaw);
  if (!owner?.trim() || owner.trim().length < 3) failures.push(`${name}: owner must be named`);
  if (!verifiedAtRaw || Number.isNaN(verifiedAt.getTime()) || verifiedAt > new Date()) failures.push(`${name}: verifiedAt must be a non-future ISO date`);
  if (!expiresAtRaw || Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) failures.push(`${name}: expiresAt must be a future ISO date`);
  if (!referencePattern.test(reference ?? '')) failures.push(`${name}: reference must be an HTTPS URL or traceable ticket/provider ID`);
  manifest[name] = { owner, verifiedAt: verifiedAtRaw, expiresAt: expiresAtRaw, reference, description };
}

if (failures.length) {
  console.error(`Production release blocked; invalid evidence:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

require('node:fs').writeFileSync('release-evidence-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
console.log('All production release evidence gates are present.');

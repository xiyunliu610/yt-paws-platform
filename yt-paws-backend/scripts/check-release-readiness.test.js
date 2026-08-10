const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const names = [
  'STRIPE_LIVE_E2E_VERIFIED_AT', 'WECHAT_LIVE_E2E_VERIFIED_AT', 'PUSH_DEVICE_E2E_VERIFIED_AT',
  'SESSION_SECURITY_REVIEW', 'PRIVATE_MEDIA_VERIFIED_AT', 'ERROR_MONITORING_VERIFIED_AT',
  'PEN_TEST_REPORT', 'BACKUP_RESTORE_VERIFIED_AT', 'ROLLBACK_DRILL_VERIFIED_AT',
];

function run(value) {
  return spawnSync(process.execPath, ['scripts/check-release-readiness.js'], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, ...Object.fromEntries(names.map((name) => [name, value])) },
  });
}

test('rejects assertion-only release evidence', () => {
  const result = run('true');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /verifiedAt must be a non-future ISO date/);
});

test('accepts owned, dated, unexpired and traceable evidence', () => {
  const result = run('Release owner|2026-08-09T00:00:00Z|2099-01-01T00:00:00Z|OPS-1234');
  assert.equal(result.status, 0, result.stderr);
});

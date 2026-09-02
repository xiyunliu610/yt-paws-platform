const test = require('node:test');
const assert = require('node:assert/strict');
const { validateProfile } = require('./release-config');

const configWith = (apiUrl, webUrl = apiUrl) => ({
  build: { production: { env: { EXPO_PUBLIC_API_URL: apiUrl, EXPO_PUBLIC_WEB_URL: webUrl } } },
});

test('rejects placeholder release URLs', () => {
  const errors = validateProfile(configWith('https://REPLACE_WITH_PRODUCTION_API_DOMAIN'), 'production');
  assert.equal(errors.length, 2);
});

test('rejects insecure or malformed release URLs', () => {
  const errors = validateProfile(configWith('http://api.pethome.nz', 'not-a-url'), 'production');
  assert.equal(errors.length, 2);
});

test('accepts real HTTPS release URLs', () => {
  assert.deepEqual(validateProfile(configWith('https://api.pethome.nz', 'https://pethome.nz'), 'production'), []);
});

test('does not apply release constraints to development', () => {
  assert.deepEqual(validateProfile({}, 'development'), []);
});

const fs = require('node:fs');
const path = require('node:path');

const RELEASE_PROFILES = new Set(['preview', 'production']);
const REQUIRED_URLS = ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_WEB_URL'];

function isPlaceholder(value) {
  return typeof value !== 'string' || !value || /REPLACE_WITH|example\.com/i.test(value);
}

function validateProfile(config, profile) {
  if (!RELEASE_PROFILES.has(profile)) return [];
  const env = config.build?.[profile]?.env ?? {};
  const errors = [];

  for (const name of REQUIRED_URLS) {
    const value = env[name];
    if (isPlaceholder(value)) {
      errors.push(`${profile}.${name} must be replaced with a real HTTPS URL`);
      continue;
    }
    try {
      if (new URL(value).protocol !== 'https:') errors.push(`${profile}.${name} must use HTTPS`);
    } catch {
      errors.push(`${profile}.${name} must be a valid URL`);
    }
  }

  return errors;
}

function loadConfig(configPath) {
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function defaultConfigPath() {
  return path.resolve(__dirname, '..', 'eas.json');
}

module.exports = { RELEASE_PROFILES, defaultConfigPath, loadConfig, validateProfile };

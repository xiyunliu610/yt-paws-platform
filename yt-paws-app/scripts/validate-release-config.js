#!/usr/bin/env node
const { RELEASE_PROFILES, defaultConfigPath, loadConfig, validateProfile } = require('./release-config');

const profileArgIndex = process.argv.indexOf('--profile');
const profile = profileArgIndex >= 0 ? process.argv[profileArgIndex + 1] : process.env.EAS_BUILD_PROFILE;

if (!profile) {
  console.log('No EAS release profile selected; release URL validation skipped.');
  process.exit(0);
}

if (!RELEASE_PROFILES.has(profile)) {
  console.log(`Profile "${profile}" is not distributed; release URL validation skipped.`);
  process.exit(0);
}

const errors = validateProfile(loadConfig(defaultConfigPath()), profile);
if (errors.length > 0) {
  console.error(`Cannot build the ${profile} profile:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log(`Release configuration for ${profile} is valid.`);

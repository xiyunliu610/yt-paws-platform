#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const packageJson = JSON.parse(read('yt-paws-app/package.json'));
const eas = JSON.parse(read('yt-paws-app/eas.json'));
const overview = read('docs/01_Project_Overview.md');
const prd = read('docs/02_Product_Requirements.md');
const architecture = read('docs/03_System_Architecture.md');

assert(
  packageJson.scripts?.['eas-build-pre-install']?.includes('validate-release-config.js'),
  'EAS builds must run the release configuration validator',
);
for (const profile of ['preview', 'production']) {
  for (const name of ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_WEB_URL']) {
    assert(typeof eas.build?.[profile]?.env?.[name] === 'string', `${profile}.${name} must be declared`);
  }
}
assert(!overview.includes('admin dashboard'), 'Overview must describe the shipped management screens accurately');
assert(!prd.includes('not yet wired into a screen'), 'PRD still says care details are not wired');
assert(!architecture.includes('Candidates: Expo Push / FCM'), 'Architecture still marks the chosen V1 push provider as TBD');
assert(!architecture.includes('Candidates: Expo Push / Firebase Cloud Messaging, TBD'), 'Technology stack still marks V1 push as TBD');

if (failures.length) {
  console.error(`Project drift checks failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('Project configuration and core-document drift checks passed.');

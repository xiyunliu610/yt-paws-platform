#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const backendRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(backendRoot, '..');
const apiDoc = fs.readFileSync(path.join(repositoryRoot, 'docs/05_API_Design.md'), 'utf8');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

const missing = [];
for (const file of walk(path.join(backendRoot, 'src')).filter((name) => name.endsWith('.controller.ts'))) {
  const source = fs.readFileSync(file, 'utf8');
  const controller = source.match(/@Controller\((?:'([^']*)')?\)/)?.[1] ?? '';
  const routePattern = /@(Get|Post|Patch|Put|Delete)\((?:'([^']*)')?\)/g;
  for (const match of source.matchAll(routePattern)) {
    const route = `/${[controller, match[2] ?? ''].filter(Boolean).join('/')}`.replace(/\/$/, '') || '/';
    if (!apiDoc.includes(`\`${route}\``)) missing.push(`${match[1].toUpperCase()} ${route}`);
  }
}

if (missing.length) {
  console.error(`API documentation is missing controller routes:\n- ${missing.join('\n- ')}`);
  process.exit(1);
}
console.log('Every implemented controller route is present in docs/05_API_Design.md.');

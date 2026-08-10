#!/usr/bin/env node
const { NestFactory } = require('@nestjs/core');
const { readFile, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const { AppModule } = require('../dist/src/app.module');
const { configureHttp } = require('../dist/src/configure-http');
const { createOpenApiDocument } = require('../dist/src/openapi');

async function main() {
  process.env.NODE_ENV = 'test';
  const app = await NestFactory.create(AppModule, { logger: false });
  configureHttp(app);
  const output = `${JSON.stringify(createOpenApiDocument(app), null, 2)}\n`;
  const target = resolve(process.cwd(), 'openapi.json');
  if (process.argv.includes('--check')) {
    const existing = await readFile(target, 'utf8').catch(() => '');
    if (existing !== output) throw new Error('openapi.json is stale; run npm run api:generate');
  } else {
    await writeFile(target, output);
    console.log(target);
  }
  await app.close();
}

main().catch((error) => { console.error(error.message); process.exit(1); });

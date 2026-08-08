const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const sourcePath = path.resolve(__dirname, '../src/screens/careDetailsPolicy.ts');
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUnderTest = { exports: {} };
vm.runInNewContext(compiled, { module: moduleUnderTest, exports: moduleUnderTest.exports });
const { canViewCareDetails } = moduleUnderTest.exports;
const booking = { customerId: 'customer-1', assignedStaffId: 'staff-1' };

test('allows the booking customer, assigned staff, owner and admin', () => {
  for (const user of [
    { id: 'customer-1', role: 'customer' },
    { id: 'staff-1', role: 'staff' },
    { id: 'owner-1', role: 'owner' },
    { id: 'admin-1', role: 'admin' },
  ]) assert.equal(canViewCareDetails(user, booking), true);
});

test('hides care details from unassigned staff and unrelated customers', () => {
  assert.equal(canViewCareDetails({ id: 'staff-2', role: 'staff' }, booking), false);
  assert.equal(canViewCareDetails({ id: 'customer-2', role: 'customer' }, booking), false);
  assert.equal(canViewCareDetails(null, booking), false);
});

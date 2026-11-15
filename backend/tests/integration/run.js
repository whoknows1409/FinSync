// Runs every integration check in this folder, one after another.
// See harness.js for what they need.
const { spawnSync } = require('child_process');
const path = require('path');

const suites = ['trading', 'budgets', 'goals', 'security', 'account'];
let failed = 0;

for (const suite of suites) {
  console.log(`\n=== ${suite} ===`);
  const result = spawnSync(process.execPath, [path.join(__dirname, `${suite}.js`)], { stdio: 'inherit' });
  if (result.status === 2) process.exit(2); // not configured: the harness has explained why
  if (result.status !== 0) failed++;
}

console.log(failed === 0 ? '\nAll integration suites passed.' : `\n${failed} integration suite(s) failed.`);
process.exit(failed === 0 ? 0 : 1);

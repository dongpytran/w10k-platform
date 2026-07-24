/**
 * w10k info — show license key status and plan details.
 */

import { validateKey } from '../lib/license.js';

export async function info(key) {
  console.log('\n🔑  Checking license key…\n');

  let result;
  try {
    result = await validateKey(key);
  } catch (err) {
    console.error(`❌  ${err.message}`);
    process.exit(1);
  }

  const statusIcon = {
    active:   '🟢',
    inactive: '🟡',
    expired:  '🔴',
    disabled: '🔴',
  }[result.status] ?? '⚪️';

  console.log(`  Key:          ${key}`);
  console.log(`  Status:       ${statusIcon}  ${result.status}`);
  console.log(`  Plan:         ${result.planName}`);
  if (result.customerName)  console.log(`  Customer:     ${result.customerName}`);
  if (result.customerEmail) console.log(`  Email:        ${result.customerEmail}`);
  if (result.expiresAt)     console.log(`  Expires:      ${result.expiresAt.slice(0, 10)}`);
  else                      console.log(`  Renewal:      Managed by your Lemon Squeezy subscription`);

  console.log('');

  if (!result.valid) {
    console.log('  To renew or reactivate: https://studio.w10k.net/\n');
    process.exit(1);
  }
}

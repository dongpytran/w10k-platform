/**
 * License validation and activation via Lemon Squeezy API.
 *
 * Docs: https://docs.lemonsqueezy.com/api/license-keys
 *
 * Set LEMONSQUEEZY_STORE_ID in the CLI source OR as env var.
 * The endpoints are public — no API key needed from the buyer.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const LS_VALIDATE_URL = 'https://api.lemonsqueezy.com/v1/licenses/validate';
const LS_ACTIVATE_URL = 'https://api.lemonsqueezy.com/v1/licenses/activate';

// The w10k Lemon Squeezy Store ID — NOT secret; embedded in the CLI source.
const STORE_ID = process.env.W10K_LS_STORE_ID || '435991';

function getConfigPath() {
  return path.join(os.homedir(), '.w10k-cli.json');
}

function loadConfig() {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {}
  return {};
}

function saveConfig(config) {
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
  } catch (e) {}
}

/**
 * Validate or activate a license key with Lemon Squeezy.
 *
 * @param {string} key  License key (a UUID, e.g. "38b1460a-5104-4067-a91d-77b872934d51")
 * @returns {{ valid: boolean, status: string, planName: string, customerName: string, expiresAt: string|null }}
 * @throws  If the network request fails or key is invalid
 */
export async function validateKey(key) {
  // If the user wants to completely bypass for a local demo video:
  if (process.env.W10K_TEST_MODE === '1' || process.env.W10K_TEST_MODE === 'true') {
    return {
      valid: true,
      status: 'active',
      planName: 'Test Plan (Local)',
      customerName: 'Demo User',
      customerEmail: 'demo@w10k.net',
      expiresAt: null,
    };
  }

  const config = loadConfig();
  const savedInstanceId = config[key]?.instance_id;

  const isStoreCheckBypassed = process.env.W10K_LS_ALLOW_ANY_STORE === '1' || process.env.W10K_LS_ALLOW_ANY_STORE === 'true';

  // 1. Attempt to validate with existing instance ID if available
  if (savedInstanceId) {
    const body = new URLSearchParams({ license_key: key, instance_id: savedInstanceId });
    try {
      const res = await fetch(LS_VALIDATE_URL, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const data = await res.json();
      
      if (res.ok && data?.valid && (data?.license_key?.status === 'active' || data?.license_key?.status === 'inactive')) {
        const meta = data.meta ?? {};
        if (isStoreCheckBypassed || STORE_ID === 'REPLACE_WITH_YOUR_STORE_ID' || String(meta?.store_id ?? '') === String(STORE_ID)) {
           return {
            valid: true,
            status: data.license_key.status,
            planName: meta?.variant_name ?? 'Unknown Plan',
            customerName: meta?.customer_name ?? '',
            customerEmail: meta?.customer_email ?? '',
            expiresAt: data.license_key.expires_at ?? null,
          };
        }
      }
    } catch (e) {
      // Ignore network or validation errors on existing instance, fall through to fresh activation
    }
  }

  // 2. Activate new instance
  const instanceName = os.hostname() || 'w10k-cli-device';
  const body = new URLSearchParams({ license_key: key, instance_name: instanceName });
  
  let res;
  try {
    res = await fetch(LS_ACTIVATE_URL, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch (networkErr) {
    throw new Error('Cannot reach Lemon Squeezy API. Check your internet connection and try again.');
  }

  const data = await res.json();

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    // 422 typically means activation limit reached
    if (res.status === 422 || msg.toLowerCase().includes('activation limit')) {
       throw new Error(`Activation limit reached. Please deactivate an old device in your Lemon Squeezy customer portal or upgrade your plan.`);
    }
    throw new Error(`License key invalid or not found: ${msg}`);
  }

  const licenseKey = data?.license_key ?? {};
  const meta = data?.meta ?? {};

  // Reject keys that don't belong to the w10k store (unless bypassed)
  if (!isStoreCheckBypassed && STORE_ID !== 'REPLACE_WITH_YOUR_STORE_ID' && String(meta?.store_id ?? '') !== String(STORE_ID)) {
    throw new Error(`License key does not belong to the w10k store. (Got store ID: ${meta?.store_id || 'unknown'})`);
  }

  // Save instance_id to config so we don't consume a new seat on the next pull
  if (data?.instance?.id) {
    config[key] = { instance_id: data.instance.id };
    saveConfig(config);
  }

  return {
    valid: licenseKey.status === 'active' || licenseKey.status === 'inactive',
    status: licenseKey.status ?? 'unknown',          // active | inactive | expired | disabled
    planName: meta?.variant_name ?? 'Unknown Plan',
    customerName: meta?.customer_name ?? '',
    customerEmail: meta?.customer_email ?? '',
    expiresAt: licenseKey.expires_at ?? null,        // null = lifetime/subscription (no fixed expiry)
  };
}

/**
 * Validate and throw a user-friendly error if not active.
 * Use this at the top of every command.
 */
export async function requireActiveKey(key) {
  console.log('🔑  Validating license key…');
  const result = await validateKey(key);

  if (!result.valid) {
    const statusMsg = {
      inactive:  'inactive — it may not have been activated yet.',
      expired:   'expired — renew at https://studio.w10k.net/',
      disabled:  'disabled — contact studio@w10k.net',
    }[result.status] ?? `not active (status: ${result.status})`;

    throw new Error(`License key is ${statusMsg}`);
  }

  console.log(`✅  ${result.planName} — welcome, ${result.customerName || 'friend'}!`);
  return result;
}

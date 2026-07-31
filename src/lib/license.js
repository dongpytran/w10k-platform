/**
 * License helpers for the @w10k/platform CLI.
 *
 * Enforcement lives in the distro proxy (Cloudflare Worker), which is the only
 * thing that holds the distro bytes. This module only:
 *   - mints a stable per-machine install_id (the seat identity), and
 *   - offers a read-only Lemon Squeezy status lookup for `info`.
 *
 * The worker binds a license to the FIRST install_id it sees and activates the
 * key server-side; the CLI no longer activates. See distro-proxy/worker.js.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const LS_VALIDATE_URL = 'https://api.lemonsqueezy.com/v1/licenses/validate';

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
 * A stable per-machine seat id. Minted once and persisted to ~/.w10k-cli.json.
 * The proxy binds the license to the FIRST install_id it sees; the same
 * install_id may re-pull / update forever, a different one is rejected.
 * Losing this file (fresh machine / wiped disk) means a new id -> the buyer
 * must ask us to rebind. That is the intended "one machine" trade-off.
 * @returns {string}
 */
export function getOrCreateInstallId() {
  const config = loadConfig();
  if (typeof config.install_id === 'string' && config.install_id.length >= 8) {
    return config.install_id;
  }
  const id = crypto.randomUUID();
  config.install_id = id;
  saveConfig(config);
  return id;
}

/**
 * Read-only Lemon Squeezy status lookup for `info`. Does NOT activate — the
 * worker owns activation, so a key that has never been pulled reads as
 * "inactive" here, which is accurate.
 *
 * @param {string} key  License key (a UUID)
 * @returns {{ valid: boolean, status: string, planName: string, customerName: string, customerEmail: string, expiresAt: string|null }}
 */
export async function validateKey(key) {
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

  const isStoreCheckBypassed =
    process.env.W10K_LS_ALLOW_ANY_STORE === '1' || process.env.W10K_LS_ALLOW_ANY_STORE === 'true';

  let data;
  try {
    const res = await fetch(LS_VALIDATE_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ license_key: key }).toString(),
    });
    data = await res.json();
  } catch (networkErr) {
    throw new Error('Cannot reach Lemon Squeezy API. Check your internet connection and try again.');
  }

  const licenseKey = data?.license_key ?? {};
  const meta = data?.meta ?? {};
  const storeOk =
    isStoreCheckBypassed ||
    STORE_ID === 'REPLACE_WITH_YOUR_STORE_ID' ||
    String(meta?.store_id ?? '') === String(STORE_ID);

  return {
    valid: storeOk && licenseKey.status === 'active',
    status: licenseKey.status ?? 'unknown', // active | inactive | expired | disabled
    planName: meta?.variant_name ?? 'Unknown Plan',
    customerName: meta?.customer_name ?? '',
    customerEmail: meta?.customer_email ?? '',
    expiresAt: licenseKey.expires_at ?? null, // null = lifetime (no fixed expiry)
  };
}

/**
 * Cheap presence check used at the top of pull/update. The real license + seat
 * check happens server-side in the proxy (see downloadLatestDistro), which
 * returns a clear error the CLI surfaces — so no network call is needed here.
 * @param {string} key
 * @returns {string} the trimmed key
 */
export function requireActiveKey(key) {
  if (!key || !String(key).trim()) {
    throw new Error(
      'Missing license key. Run: npx @w10k/platform pull --key=<your-license-key>\n' +
      'Your key was emailed to you after purchase at https://studio.w10k.net/',
    );
  }
  return String(key).trim();
}

/**
 * Download and extract the w10k distro zip through the distro proxy.
 *
 * The proxy (Cloudflare Worker at dl.w10k.net) is the security gate: it
 * validates the license key with Lemon Squeezy and only then streams the zip
 * from a PRIVATE GitHub release. The zip is never publicly reachable, and the
 * GitHub token lives only inside the Worker — never in this CLI.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { createWriteStream, mkdirSync } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { getOrCreateInstallId } from './license.js';

const execAsync = promisify(exec);

// The distro proxy endpoint. Override for local testing with W10K_PROXY.
const PROXY_URL = process.env.W10K_PROXY || 'https://dl.w10k.net/latest';

// This CLI's own version, sent to the proxy for the audit log.
function cliVersion() {
  try {
    const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../package.json');
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Extract a zip into a directory using system `tar` — bsdtar reads zip and
 * ships on macOS, Linux, and Windows 10+ (`unzip` does not exist on Windows).
 */
export async function unzip(zipPath, destDir) {
  mkdirSync(destDir, { recursive: true });
  await execAsync(`tar -xf "${zipPath}" -C "${destDir}"`);
}

/**
 * Download the latest distro through the proxy and extract it.
 * @param {string} key  the buyer's license key
 * @returns {{ tag: string, extractDir: string, tmpDir: string }}
 */
export async function downloadLatestDistro(key) {
  // Send the stable per-machine install_id. The proxy binds the license to the
  // first install_id it sees; a different machine gets a new id and is rejected.
  // This is the single-seat gate that limits key sharing.
  const installId = getOrCreateInstallId();
  const headers = {
    'x-license-key': key,
    'x-install-id': installId,
    'x-w10k-cli': cliVersion(),
  };

  const res = await fetch(PROXY_URL, { headers });
  if (res.status === 401 || res.status === 403 || res.status === 426 || res.status === 503) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'License is not valid for downloads.');
  }
  if (!res.ok || !res.body) {
    throw new Error(`Download failed (HTTP ${res.status}).`);
  }

  const plan = res.headers.get('x-w10k-plan');
  if (plan) console.log(`✅  ${plan} — license verified.`);
  console.log('⬇️   Downloading distro…');

  const tag = res.headers.get('x-w10k-tag') || 'latest';
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w10k-'));
  const zipPath = path.join(tmpDir, 'w10k-distro.zip');

  await pipeline(Readable.fromWeb(res.body), createWriteStream(zipPath));

  const extractDir = path.join(tmpDir, 'extracted');
  console.log('📂  Extracting…');
  await unzip(zipPath, extractDir);

  // the zip may contain a single top-level folder; unwrap it
  const entries = fs.readdirSync(extractDir);
  const rootDir =
    entries.length === 1 && fs.statSync(path.join(extractDir, entries[0])).isDirectory()
      ? path.join(extractDir, entries[0])
      : extractDir;

  console.log(`📦  Distro ${tag} ready.`);
  return { tag, extractDir: rootDir, tmpDir };
}

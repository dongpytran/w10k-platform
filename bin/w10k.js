#!/usr/bin/env node
/**
 * @w10k/platform — CLI entry point
 *
 * Usage:
 *   npx @w10k/platform pull   --key=W10K-XXXX-XXXX
 *   npx @w10k/platform update --key=W10K-XXXX-XXXX
 *   npx @w10k/platform info   --key=W10K-XXXX-XXXX
 */

import { pull } from '../src/commands/pull.js';
import { update } from '../src/commands/update.js';
import { info } from '../src/commands/info.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const args = process.argv.slice(2);
const command = args[0];

// Parse --key=VALUE or --key VALUE
function getArg(name) {
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith(`--${name}=`)) return args[i].split('=').slice(1).join('=');
    if (args[i] === `--${name}` && args[i + 1]) return args[i + 1];
  }
  return null;
}

const key = getArg('key');

const HELP = `
@w10k/platform — luxury website builder CLI

Usage:
  npx --yes @w10k/platform@latest <command> --key=<license-key>

  Always include @latest — a bare "npx @w10k/platform" can run a stale cached
  copy. (The CLI also auto-updates itself on pull/update as a safety net.)

Commands:
  pull    Download the full w10k platform to current directory
  update  Merge latest core (catalog, knowledge, recipes, skills) — preserves your personal layer
  info    Show license status and plan details

Options:
  --key   Your license key (received via email after purchase)

Examples (Lemon Squeezy keys are UUIDs):
  npx --yes @w10k/platform@latest pull --key=38b1460a-5104-4067-a91d-77b872934d51
  npx --yes @w10k/platform@latest update --key=38b1460a-5104-4067-a91d-77b872934d51
  npx --yes @w10k/platform@latest info --key=38b1460a-5104-4067-a91d-77b872934d51
`.trim();

function cmpSemver(a, b) {
  const pa = String(a).match(/^(\d+)\.(\d+)\.(\d+)/);
  const pb = String(b).match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!pa || !pb) return 0;
  for (let i = 1; i <= 3; i++) {
    const d = Number(pa[i]) - Number(pb[i]);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

/**
 * Auto-upgrade. `npx @w10k/platform` (without @latest) can reuse a stale cached
 * copy, which then fails the proxy's version floor. So on pull/update we check
 * the published latest and, if this copy is older, transparently re-run the
 * latest version with the same arguments — the user always ends up on current.
 * Opt out with W10K_NO_AUTO_UPDATE=1. Offline/timeout → silently run as-is.
 */
async function autoUpdate() {
  if (process.env.W10K_REEXEC === '1' || process.env.W10K_NO_AUTO_UPDATE === '1') return;
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const current = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')).version;

    const res = await fetch('https://registry.npmjs.org/@w10k/platform/latest', {
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return;
    const latest = (await res.json()).version;
    if (!latest || cmpSemver(current, latest) >= 0) return; // already current

    if (command === 'pull' || command === 'update') {
      console.log(`\n⬆️   w10k CLI ${current} is outdated — auto-updating to ${latest}…\n`);
      const r = spawnSync('npx', ['--yes', `@w10k/platform@${latest}`, ...process.argv.slice(2)], {
        stdio: 'inherit',
        env: { ...process.env, W10K_REEXEC: '1' },
        shell: process.platform === 'win32',
      });
      process.exit(r.status ?? 0);
    }

    // Non-download commands: notify, don't re-exec.
    console.log(
      `\n⬆️   Update available: ${current} → ${latest}. Run: npx --yes @w10k/platform@latest ${command || ''}\n`,
    );
  } catch (e) {
    // Offline / timeout / registry error → run the current version.
  }
}

async function main() {
  await autoUpdate();

  if (!command || command === '--help' || command === '-h') {
    console.log(HELP);
    process.exit(0);
  }

  if (!key && command !== '--help') {
    console.error('\n❌  --key is required. Get your key at https://studio.w10k.net/\n');
    process.exit(1);
  }

  switch (command) {
    case 'pull':   await pull(key);   break;
    case 'update': await update(key); break;
    case 'info':   await info(key);   break;
    default:
      console.error(`\n❌  Unknown command: "${command}"\n`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n❌  ' + (err.message || err));

  // Always tell the user how to get onto the latest version — a stale cached
  // CLI (npx reuses old copies) is the most common cause of confusing errors.
  const cmd = ['pull', 'update', 'info'].includes(command) ? command : 'pull';
  const upgradeCmd = `npx --yes @w10k/platform@latest ${cmd} --key=<your-key>`;

  if (err.needsUpgrade || err.httpStatus === 426 || /upgrade|out ?dated|need >=/i.test(String(err.message))) {
    console.error('\n⬆️   Your CLI is outdated. Update and re-run:');
    console.error(`      ${upgradeCmd}\n`);
  } else {
    console.error('\n💡  If this keeps happening, you may be on a cached old version — update and retry:');
    console.error(`      ${upgradeCmd}\n`);
  }
  process.exit(1);
});

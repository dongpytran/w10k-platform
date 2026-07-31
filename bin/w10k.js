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
  npx @w10k/platform <command> --key=<license-key>

Commands:
  pull    Download the full w10k platform to current directory
  update  Merge latest core (catalog, knowledge, recipes, skills) — preserves your personal layer
  info    Show license status and plan details

Options:
  --key   Your license key (received via email after purchase)

Examples (Lemon Squeezy keys are UUIDs):
  npx @w10k/platform pull --key=38b1460a-5104-4067-a91d-77b872934d51
  npx @w10k/platform update --key=38b1460a-5104-4067-a91d-77b872934d51
  npx @w10k/platform info --key=38b1460a-5104-4067-a91d-77b872934d51
`.trim();

async function checkUpdate() {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    const currentVersion = pkg.version;

    const res = await fetch('https://registry.npmjs.org/@w10k/platform/latest', { 
      signal: AbortSignal.timeout(1000) 
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.version && data.version !== currentVersion) {
        console.log(`\n\x1b[33m╭─────────────────────────────────────────────────────────────────╮`);
        console.log(`│                                                                 │`);
        console.log(`│   ⚠️  Update available! \x1b[2m${currentVersion}\x1b[0m\x1b[33m -> \x1b[1m${data.version}\x1b[0m\x1b[33m                             │`);
        console.log(`│   Run \x1b[1mnpx --yes @w10k/platform@latest ${command || ''}\x1b[0m\x1b[33m to use it.             │`);
        console.log(`│                                                                 │`);
        console.log(`╰─────────────────────────────────────────────────────────────────╯\x1b[0m\n`);
      }
    }
  } catch (e) {
    // Ignore update check failures silently (e.g. no internet, timeout)
  }
}

async function main() {
  await checkUpdate();

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

/**
 * w10k pull — download the full platform to the current directory.
 *
 * Use on first-time setup. Overwrites everything in the core paths.
 * Personal layer (build-notes/, inspirations/, laboratory/) is NOT touched
 * because it doesn't exist on a fresh pull anyway.
 */

import fs from 'fs';
import path from 'path';
import { requireActiveKey } from '../lib/license.js';
import { downloadLatestDistro, writeWatermark } from '../lib/download.js';

export async function pull(key) {
  await requireActiveKey(key);

  const dest = process.cwd();

  // A fresh pull into a non-empty directory silently overwrites CLAUDE.md,
  // catalog/, etc. — surface that before it happens.
  const existing = fs.readdirSync(dest).filter((e) => !e.startsWith('.'));
  if (existing.length > 0) {
    if (fs.existsSync(path.join(dest, 'CLAUDE.md'))) {
      throw new Error(
        'This directory already contains a w10k installation.\n' +
        'Use `npx @w10k/platform update --key=<key>` to update it — ' +
        '`pull` would overwrite core files without preserving anything.'
      );
    }
    console.log(`⚠️   Directory is not empty (${existing.length} entries) — matching files will be overwritten.`);
  }

  console.log(`\n📥  Pulling w10k platform into: ${dest}\n`);

  const { tag, extractDir, tmpDir, license } = await downloadLatestDistro(key);

  // Copy everything from the distro into the current directory
  const entries = fs.readdirSync(extractDir);
  for (const entry of entries) {
    const src  = path.join(extractDir, entry);
    const dst  = path.join(dest, entry);
    fs.cpSync(src, dst, { recursive: true, force: true });
  }

  // Write the per-buyer watermark into the install.
  writeWatermark(dest, license);

  // Clean up temp files
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log(`\n✅  w10k ${tag} pulled successfully!`);
  console.log('\nNext steps:');
  console.log('  1. Open this folder in Cursor, Windsurf, or your AI-powered IDE');
  console.log('  2. Let the AI agent read CLAUDE.md (it will do this automatically)');
  console.log('  3. Run your first build:  /w10k-ship "brief about your client"');
  console.log('\nUpdate anytime with:');
  console.log(`  npx --yes @w10k/platform@latest update --key=${key}`);
}

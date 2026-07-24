/**
 * w10k update — merge latest core into an existing w10k installation.
 *
 * CORE PATHS (always overwritten with latest from upstream):
 *   catalog/
 *   knowledge/design/
 *   knowledge/motion/
 *   knowledge/process/
 *   recipes/
 *   taste/              (reference-DNA library + index — buyers get the latest tastes)
 *   .agents/skills/
 *   CLAUDE.md
 *   AGENTS.md
 *
 * PERSONAL PATHS (never touched — belong to the buyer):
 *   knowledge/build-notes/
 *   knowledge/_archive/
 *   inspirations/
 *   laboratory/
 *   apps/
 *   packages/forms/     (buyer may have customised embed)
 */

import fs from 'fs';
import path from 'path';
import { cpSync, rmSync } from 'fs';
import { requireActiveKey } from '../lib/license.js';
import { downloadLatestDistro } from '../lib/download.js';

// Paths that are owned by upstream and will be updated.
// NOTE: packages/forms ships in the distro (pull) but is NOT listed here —
// the buyer customises the endpoint, so update never overwrites it.
// .claude/skills (not .claude/) so buyer settings survive updates.
const CORE_PATHS = [
  'catalog',
  path.join('knowledge', 'design'),
  path.join('knowledge', 'motion'),
  path.join('knowledge', 'process'),
  'recipes',
  'taste',
  'docs',
  path.join('.agents', 'skills'),
  path.join('.claude', 'skills'),
  'CLAUDE.md',
  'AGENTS.md',
];

export async function update(key) {
  await requireActiveKey(key);

  const dest = process.cwd();

  // Sanity check: make sure this looks like a w10k installation
  if (!fs.existsSync(path.join(dest, 'CLAUDE.md'))) {
    throw new Error(
      'No CLAUDE.md found in the current directory.\n' +
      'Run `npx @w10k/platform pull --key=<key>` first to set up a fresh installation.'
    );
  }

  console.log(`\n🔄  Updating w10k core in: ${dest}`);
  console.log('    (Your build-notes, inspirations, and laboratory/ will NOT be touched)\n');

  const { tag, extractDir, tmpDir } = await downloadLatestDistro(key);

  let updated = 0;
  let skipped = 0;

  for (const corePath of CORE_PATHS) {
    const src = path.join(extractDir, corePath);
    const dst = path.join(dest, corePath);

    if (!fs.existsSync(src)) {
      skipped++;
      continue;
    }

    const isDir = fs.statSync(src).isDirectory();

    if (isDir) {
      // Remove old version, copy fresh
      if (fs.existsSync(dst)) rmSync(dst, { recursive: true, force: true });
      cpSync(src, dst, { recursive: true });
    } else {
      // File: just overwrite
      cpSync(src, dst, { force: true });
    }

    console.log(`  ✓  ${corePath}`);
    updated++;
  }

  // Clean up temp files
  rmSync(tmpDir, { recursive: true, force: true });

  console.log(`\n✅  w10k updated to ${tag} — ${updated} paths refreshed, ${skipped} not found in release.`);

  if (skipped > 0) {
    console.log('    Tip: Some paths in the release were missing. This is normal for older releases.');
  }
}

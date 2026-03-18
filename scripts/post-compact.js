#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// POST-COMPACT HOOK
// Fires AFTER /compact. Reinjects the saved critical context
// so Claude knows exactly what was lost and what matters.
// Uses the brand new PostCompact hook (shipped March 14 2026).
// ─────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import os from 'os';

const GUARD_DIR = path.join(os.homedir(), '.claude-compact-guard');

async function main() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;

  let hookData: Record<string, unknown> = {};
  try { hookData = JSON.parse(input); } catch { process.exit(0); }

  const sessionId = String(hookData.session_id ?? 'unknown');
  const snapshotPath = path.join(GUARD_DIR, `${sessionId}.json`);

  if (!fs.existsSync(snapshotPath)) {
    process.exit(0); // No pre-compact snapshot — nothing to inject
  }

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  const { critical } = snapshot;

  if (!critical) process.exit(0);

  // Build recovery context block
  const lines = [
    '## ⚡ claude-compact-guard — Context Recovery',
    '',
    '> Compaction occurred. Critical context restored automatically.',
    '',
  ];

  if (critical.currentTask) {
    lines.push(`**Current task:** ${critical.currentTask}`, '');
  }

  if (critical.keyDecisions?.length) {
    lines.push('**Key decisions made:**');
    critical.keyDecisions.forEach((d: string) => lines.push(`- ${d}`));
    lines.push('');
  }

  if (critical.criticalFiles?.length) {
    lines.push('**Critical files being worked on:**');
    critical.criticalFiles.forEach((f: string) => lines.push(`- ${f}`));
    lines.push('');
  }

  if (critical.openProblems?.length) {
    lines.push('**Open problems / unresolved issues:**');
    critical.openProblems.forEach((p: string) => lines.push(`- ${p}`));
    lines.push('');
  }

  if (critical.importantContext) {
    lines.push(`**Important context:** ${critical.importantContext}`, '');
  }

  lines.push('---', '');

  const output = {
    type: 'system_context',
    content: lines.join('\n'),
  };

  process.stdout.write(JSON.stringify(output));

  // Clean up snapshot
  try { fs.unlinkSync(snapshotPath); } catch {}

  console.error(`[claude-compact-guard] Context recovered for session ${sessionId}`);
  process.exit(0);
}

main().catch(() => process.exit(0));

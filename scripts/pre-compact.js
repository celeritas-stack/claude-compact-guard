#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// PRE-COMPACT HOOK
// Fires BEFORE /compact destroys context.
// Extracts and saves the most critical information.
// ─────────────────────────────────────────────────────────────

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
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
  const transcript = hookData.transcript as unknown[] ?? [];

  if (!transcript.length) process.exit(0);

  // Build transcript text
  const transcriptText = transcript
    .map((m: unknown) => {
      const msg = m as Record<string, unknown>;
      return `${String(msg.role ?? '').toUpperCase()}: ${
        typeof msg.content === 'string' ? msg.content.slice(0, 500) : ''
      }`;
    })
    .join('\n')
    .slice(0, 12000);

  // Extract critical context via AI
  const critical = await extractCriticalContext(transcriptText);

  // Save pre-compact snapshot
  if (!fs.existsSync(GUARD_DIR)) fs.mkdirSync(GUARD_DIR, { recursive: true });

  const snapshot = {
    sessionId,
    savedAt: new Date().toISOString(),
    critical,
  };

  fs.writeFileSync(
    path.join(GUARD_DIR, `${sessionId}.json`),
    JSON.stringify(snapshot, null, 2),
    'utf-8'
  );

  console.error(`[claude-compact-guard] Pre-compact snapshot saved for session ${sessionId}`);
  process.exit(0);
}

async function extractCriticalContext(transcript: string): Promise<Record<string, unknown>> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: 'Extract the most critical context from a Claude Code session that must survive compaction. Respond only with JSON.',
      messages: [{
        role: 'user',
        content: `Session transcript:\n${transcript}\n\nExtract:\n{"currentTask":"what is being worked on","keyDecisions":["decision1"],"criticalFiles":["file1"],"openProblems":["problem1"],"importantContext":"any other critical info"}`,
      }],
    });

    const text = (message.content[0] as Anthropic.TextBlock).text;
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return { currentTask: 'Unknown — compaction occurred', keyDecisions: [], criticalFiles: [], openProblems: [] };
  }
}

main().catch(() => process.exit(0));

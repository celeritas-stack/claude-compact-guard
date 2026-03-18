# claude-compact-guard ⚡

> Saves what matters before /compact destroys it. Zero context loss.

`/compact` is brutal. It throws away everything. Claude forgets what you were doing, what decisions were made, what files matter.

**claude-compact-guard fixes that.**

Uses the new `PreCompact` and `PostCompact` hooks (shipped March 14 2026) to snapshot critical context before compaction — and automatically inject it back after. Claude never loses the thread.

---

## Install

```bash
/plugin marketplace add yourusername/claude-compact-guard
/plugin install claude-compact-guard
```

## What it saves

- What task was in progress
- Key architectural decisions made
- Which files were being worked on
- Open problems / unresolved issues
- Any other critical context

## What recovery looks like

```
## ⚡ claude-compact-guard — Context Recovery

> Compaction occurred. Critical context restored automatically.

**Current task:** Implementing Redis cache layer for user sessions

**Key decisions made:**
- Using Redis Cluster not standalone for HA
- TTL set to 3600s to match JWT expiry
- Decided against in-memory fallback

**Critical files:**
- src/cache/redis.ts
- src/middleware/session.ts

**Open problems:**
- Connection pooling under high load not tested yet
```

That's what Claude sees after every compaction. Full continuity. Zero manual work.

---

*First plugin to use the PostCompact hook. Shipped 4 days after Anthropic released it.*

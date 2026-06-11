# /ops — Sovereign System Package (applicato 2026-06-11)

Costituzione operativa del sistema Norma ad alta autonomia. Fonte: pacchetto esterno,
adattato. **Regola di precedenza:** in conflitto, vince CLAUDE.md (guardrail) → poi /ops →
poi le spec di corsia.

## Mappa pacchetto → sistema vivo (per non duplicare)

| Concetto pacchetto    | Implementazione Norma                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Constitutional memory | CLAUDE.md + /ops                                                                                                 |
| Operational memory    | ~/dev/norma-gtm/STATO.md                                                                                         |
| Episodic memory       | DECISIONS.md · NIGHT-LOG.md · NEEDS-HUMAN.md                                                                     |
| Evidence memory       | Drive (piano marketing, database target) · docs/ · norma-gtm/                                                    |
| Task spec             | .claude/specs/lane-\*.md                                                                                         |
| Builder               | corsie Claude Code (worktree)                                                                                    |
| Critic + Governor     | CI (lint/typecheck/test/build/E2E) + classi di rischio (docs/ops/GOVERNANCE.md) + review umana per HIGH/CRITICAL |
| Operator              | norma-fleet.sh · norma-watchdog.sh · norma-relay.sh · task schedulati                                            |
| Morning report        | daily-ops 9:00                                                                                                   |
| Frozen areas          | vedi AGENT_LAWS.md §Frozen                                                                                       |

## File

AGENT_LAWS · TOOL_ACCESS_MATRIX · SKILL_REGISTRY · MEMORY_MODEL · GOVERNOR_RULES ·
PROMPT_TEMPLATES · AGENT_ROLES · LEGAL_BOUNDARIES · DATA_PRIVACY_RULES

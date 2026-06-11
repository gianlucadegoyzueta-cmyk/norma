# AGENT_ROLES (con mappatura Norma)

- **Brain** — coordina e prioritizza → Claude in Cowork (questa chat)
- **Planner** — obiettivi → spec → Claude in Cowork (scrive .claude/specs/)
- **Builder** — implementa le spec → corsie Claude Code su worktree
- **Critic** — trova i difetti → CI completa (lint/typecheck/test/build/E2E) + review umana
- **Governor** — permette/blocca/escala → GOVERNOR_RULES + classi di rischio + founder
- **Operator** — deploy/log/runtime → fleet/watchdog/relay + Vercel/Supabase MCP + daily-ops
- **Researcher** — evidenza esterna → unità di ricerca (es. istat) + WebSearch in Cowork
- **Support** — triage utenti → da attivare al primo utente esterno
- **Red Team** — cerca failure mode → skill_security_audit/skill_privacy_audit pre-pilota
- **Memory Librarian** — memoria ordinata → Claude in Cowork (STATO/DECISIONS/NIGHT-LOG)

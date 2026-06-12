#!/bin/zsh
# Governance-as-code: hook PreToolUse per Claude Code (vedi .claude/settings.json).
# Blocca MECCANICAMENTE le violazioni delle frozen areas — anche in bypass permissions.
# Input: JSON dell'invocazione tool su stdin. Output: exit 2 = blocco (stderr → all'agente).

INPUT=$(cat)
TOOL=$(printf '%s' "$INPUT" | $HOME/bin/jq -r '.tool_name // empty' 2>/dev/null || echo "")

deny() { echo "FROZEN AREA (ops/AGENT_LAWS.md): $1 — serve autorizzazione esplicita del founder." >&2; exit 2; }

case "$TOOL" in
  Bash)
    CMD=$(printf '%s' "$INPUT" | $HOME/bin/jq -r '.tool_input.command // empty')
    case "$CMD" in
      *"push"*"--force"*main*|*"push"*"-f "*main*) deny "force-push su main" ;;
      *"prisma migrate reset"*) deny "migrate reset (distruttivo)" ;;
      *"ALLOGGIATI_CRON_ENABLED=true"*|*"ALLOGGIATI_CRON_ENABLED=1"*) deny "attivazione cron invii Questura" ;;
      *"gh pr merge"*56*|*"gh pr merge feat/cron-send-reconcile"*) deny "merge della PR #56 (cron invii)" ;;
    esac
    ;;
  Edit|Write|MultiEdit)
    FILE=$(printf '%s' "$INPUT" | $HOME/bin/jq -r '.tool_input.file_path // empty')
    case "$FILE" in
      */alloggiati/adapters/SoapAlloggiatiSender*|*/api/cron/alloggiati*) deny "logica di invio LIVE alla Questura ($FILE)" ;;
      *vercel.json) deny "config cron Vercel ($FILE)" ;;
    esac
    ;;
esac
exit 0

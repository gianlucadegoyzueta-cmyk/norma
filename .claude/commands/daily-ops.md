# /daily-ops — controllo operativo giornaliero

Esegui il check di salute di Norma e produci un report sintetico:

1. **Prod:** `curl -s https://app.norma.casa/api/health` (status, uptime) e
   `curl -s -o /dev/null -w "%{http_code}" https://norma.casa` (marketing).
2. **CI/PR:** `gh pr list` + `gh pr checks` sulle PR aperte; `gh run list --limit 5` per la CI su main.
3. **Backup:** ultima riga di `~/backups/norma/backup.log` — deve esserci un OK nelle ultime 24h;
   se manca, esegui `~/bin/norma-backup.sh` e segnala il problema.
4. **DB:** `cd ~/dev/norma && env NODE_ENV= npx prisma migrate status` (schema allineato?).
5. **Outbox:** se accessibile, conta schedine PENDING con attempts ≥ 5 (candidate NEEDS_REVIEW).

Report finale: 5 righe max — verde/giallo/rosso per prod, CI, backup, DB, outbox + l'unica
azione più importante da fare oggi. Niente fronzoli.

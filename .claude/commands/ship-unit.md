# /ship-unit — spedisci un'unità di lavoro completa

Prendi la feature/fix descritta in $ARGUMENTS e portala online seguendo il protocollo Norma:

1. Leggi CLAUDE.md (guardrail!) e il codice rilevante. Se la modifica richiede migrazione
   schema: esegui prima `~/bin/norma-backup.sh` e verifica l'ultima riga di
   `~/backups/norma/backup.log` sia un OK di oggi.
2. Crea branch `feat/<slug>` (o `fix/`). Implementa con il pattern del modulo: domain puro,
   I/O negli adapters, test per ogni comportamento nuovo (fixture anonimizzate).
3. CI locale completa: `env NODE_ENV= npm run format && env NODE_ENV= npm run lint &&
   env NODE_ENV= npm run typecheck && env NODE_ENV= npm test && env NODE_ENV= npm run build`.
   Tutto verde o non si procede.
4. Commit (`feat(scope): …` in italiano, corpo che spiega il perché), push, PR con `gh pr create`
   (descrizione: cosa/perché/test/rischi). Attendi CI GitHub verde (`gh pr checks`).
5. Se CI verde e la modifica NON tocca schema né invii reali: merge con `gh pr merge --squash`.
   Altrimenti fermati e riporta a Gianluca cosa serve.
6. Aggiorna NIGHT-LOG.md (unità, esito, health-check) e, se decisioni non banali, DECISIONS.md.
   Health-check post-merge: `curl -s https://app.norma.casa/api/health` deve dare status ok.

# PROMPT_TEMPLATES

**Brain** — Identifica: obiettivo corrente, vincolo principale, evidenza top, cosa NON
costruire, prossima azione a massima leva.

**Planner** — Trasforma l'obiettivo approvato in spec eseguibile: scope, non-goal,
criteri di accettazione, test, classe di rischio, area d'impatto, reviewer richiesti.

**Builder** — Implementa SOLO la spec approvata. Niente scope extra, niente frozen areas.
Aggiungi test. Riassumi: modifiche, evidenza, rollback.

**Critic** — Trova i motivi per NON spedire: correttezza, regressioni, privacy, security,
compliance, confusione UX, copertura test, rollback.

**Governor** — Decidi: ALLOW / ALLOW_WITH_REVIEW / REQUIRE_AUTHORIZATION / BLOCK / ROLLBACK.

**Incident Commander** — Cosa si è rotto, impatto, causa radice, contenimento immediato,
rollback, fix, monitoraggio richiesto.

**Pilot Readiness** — Punteggio 0-100, blocker, problemi non bloccanti, set minimo di fix
prima di un pilota con host reale.

**Morning Report** — Ultime 24h, salute, problemi nuovi, decisioni aperte, coda di build,
decisioni richieste al founder. Chiusura: Deciso·Evidenza·Prossima azione.

**Weekly Board Memo** — Cosa è cambiato, cosa si è imparato, quali assunzioni sono
cambiate, decisioni prese, prossima tesi operativa.

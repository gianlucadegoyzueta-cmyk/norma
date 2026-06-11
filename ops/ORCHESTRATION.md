# ORCHESTRATION — distillato (2026-06-12)

Dal secondo pacchetto esterno ("Orchestration Package") adottiamo SOLO ciò che aggiunge.
Il resto (router, orchestrator, subagent prompts, tool wrappers, workflow library) descrive
il sistema già operante — vedi INDEX.md per la mappa — e duplicarlo violerebbe AGENT_LAWS
(anti-pattern: overengineering). Verdetto registrato qui per non rilitigarlo.

## 1 · Formato standard di entry per la memoria episodica (DECISIONS/NIGHT-LOG)

```
Data: · Contesto: · Evento: · Decisione: · Evidenza: · Impatto: · Follow-up:
```

Riconciliazione: se nuova informazione contraddice memoria vecchia, tieni entrambe e
marca lo stato corrente. Mai sovrascrivere la storia.

## 2 · Hard stops (fermata immediata, integrano i BLOCK del governor)

- Spec mancante o non chiara → fermati, chiedi (formato GOVERNANCE §2).
- Lavoro oltre lo scope approvato → fermati, riporta.
- L'agente non sa spiegare in linguaggio semplice cosa sta facendo → fermati.
- Output che poggia su assunzioni non supportate → marca e fermati.
- (+ tutte le block conditions di GOVERNOR_RULES.md)

Comportamento allo stop: 1) ferma 2) riporta 3) nomina il blocco esatto 4) proponi il
più piccolo passo successivo 5) aggiorna memoria se rilevante.

## 3 · Template di output per ogni unità (nel body della PR)

```
Obiettivo · Cosa ho fatto · Cosa ho trovato · Evidenza (test/numeri) · Rischi ·
Classe di rischio · File toccati · Test eseguiti · Memoria aggiornata (sì/dove) ·
Prossima azione
```

## Regola di chiusura della costituzione

La costituzione è COMPLETA. Nuovi documenti normativi si aggiungono solo se indicano un
fallimento REALE già avvenuto che avrebbero prevenuto. La leva adesso è eseguire, non
legiferare. (Mantra: one task, one mission, one output, one memory update, one next step.)

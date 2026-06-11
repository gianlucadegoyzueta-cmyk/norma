# GOVERNOR_RULES

## Stati di decisione

ALLOW · ALLOW_WITH_REVIEW · REQUIRE_AUTHORIZATION · BLOCK · ROLLBACK

## Input del governor

Spec del task · classe di rischio (GOVERNANCE.md §1) · diff · stato CI · frozen areas
(AGENT_LAWS) · qualità dell'evidenza.

## Condizioni di BLOCK obbligatorio

CI rossa su percorsi critici · rollback mancante su modifiche non banali · impatto di
produzione non rivisto · rischio esposizione dati ospiti · modifiche al flusso live
Questura senza autorizzazione · modifiche billing senza autorizzazione · schema senza
piano di migrazione+backup · claim che aumentano esposizione legale senza review ·
scope drift oltre il task approvato.

## Escalation

One-way door → founder, sempre · medium → review (CI+giudizio) · high → autorizzazione
esplicita · evidenza debole → BLOCK o richiesta di più evidenza.

## Principio

Il governor non esiste per essere accomodante: esiste per fermare le azioni irreversibili
sbagliate. In Norma il governor è: CI completa + classi di rischio + frozen areas + il
founder per ciò che è suo.

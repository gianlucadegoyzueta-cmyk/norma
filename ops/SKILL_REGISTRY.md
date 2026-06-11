# SKILL_REGISTRY

Capacità modulari caricabili dalle corsie. Regola: carica la skill più specifica prima di
agire; se nessuna esiste, creala in questo registro (o come spec) prima di procedere.

| Skill                     | Scopo                                                        | Note Norma                       |
| ------------------------- | ------------------------------------------------------------ | -------------------------------- |
| skill_pilot_readiness     | Punteggio 0-100 di prontezza al pilota, blocker e fix minimi | usa template in PROMPT_TEMPLATES |
| skill_code_review         | Diff: correttezza, scope drift, regressioni                  | già prassi PR                    |
| skill_security_audit      | Auth, segreti, logging, permessi, superficie d'attacco       | da eseguire pre-pilota           |
| skill_privacy_audit       | Minimizzazione, retention, esposizione dati ospiti           | HIGH di default                  |
| skill_compliance_audit    | Claim e flussi legali, ambiguità                             | con LEGAL_BOUNDARIES             |
| skill_db_migration        | Schema, rollback, impatti a valle                            | guardrail 2 + Postgres locale    |
| skill_manual_qa           | Piani di test manuali sui flussi critici                     | pre-scongelamento invii          |
| skill_incident_response   | Triage, impatto, rollback, recovery                          | template Incident Commander      |
| skill_pricing_analysis    | Prezzo, packaging, WTP, segmenti                             | fonte: piano marketing Drive     |
| skill_competitor_research | Posizionamento e gap competitor                              | evidence → norma-gtm             |
| skill_support_triage      | Severità, causa, prossima azione                             | quando ci saranno utenti         |
| skill_onboarding_review   | Frizione, fiducia, abbandono                                 | post-#72                         |
| skill_legal_copy_review   | Linguaggio esterno, rischio claim                            | vale anche per guide SEO         |

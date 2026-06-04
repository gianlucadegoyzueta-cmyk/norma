# NEEDS-HUMAN — parcheggiati (richiedono un'azione umana sicura)

> Qui finisce SOLO ciò che non posso portare online in sicurezza in autonomia:
> migrazioni su DB di produzione (serve backup garantito), segreti/accessi che non ho,
> o unità rollbackate. Ognuna ha lo stato e cosa serve da te.

## Perché molte feature sono qui

Tutte le feature che cambiano lo schema del DB richiedono una migrazione su Supabase di
produzione. Non applico migrazioni in prod senza un backup/restore garantito (vedi DECISIONS D0).
Per ognuna lascio: codice su branch + PR, test verdi, e la migrazione **generata** (file SQL) ma
**non applicata**. Per attivarle: fai un backup del DB, poi `prisma migrate deploy` (o il workflow
migrate.yml già presente, che gira al merge su main).

---

## Parcheggiate

<!-- ### Titolo — branch — perché è qui — cosa serve da te -->

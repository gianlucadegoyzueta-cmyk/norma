# /night-run — corsa notturna autonoma

Lavora in autonomia sul backlog di Norma per la durata indicata in $ARGUMENTS (default: finché
c'è backlog sicuro). Protocollo:

1. Leggi CLAUDE.md, NEEDS-HUMAN.md, NIGHT-LOG.md, DECISIONS.md e `gh pr list` per lo stato.
2. Scegli SOLO unità sicure e reversibili (vedi D0): niente Send reali, niente migrazioni
   senza backup verificato di giornata, niente cancellazioni. Ogni unità = un branch + PR.
3. Per ogni unità segui il protocollo di /ship-unit. Unità che richiedono azione umana →
   parcheggiale in NEEDS-HUMAN.md con stato e cosa serve.
4. A fine corsa scrivi in NIGHT-LOG.md il riepilogo: unità spedite (con hash main), parcheggiate,
   decisioni prese, health-check finale. Tono asciutto, fatti verificabili.

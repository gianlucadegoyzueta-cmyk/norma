# /night-run — corsa notturna autonoma

Lavora in autonomia sul backlog di Norma per la durata indicata in $ARGUMENTS (default: finché
c'è backlog sicuro). Protocollo:

1. Leggi CLAUDE.md, NIGHT-LOG.md, DECISIONS.md e `gh pr list` per lo stato.
2. Scegli unità reversibili (vedi D0): migrazioni solo con backup verificato di giornata.
   Ogni unità = un branch + PR.
3. Per ogni unità segui il protocollo di /ship-unit.
4. A fine corsa scrivi in NIGHT-LOG.md il riepilogo: unità spedite (con hash main), decisioni
   prese, health-check finale.

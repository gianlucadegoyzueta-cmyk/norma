# Corsia D — Design con loop visivo (vede ciò che tocca)

**Obiettivo:** alzare la qualità visiva dell'APP (non il marketing site) con un loop
screenshot → critica → correzione → re-screenshot. Tu PUOI vedere le immagini: usalo.

## Metodo di lavoro (il loop visivo)

1. Avvia l'app in locale sulla PORTA 3010 (la 3000 può essere occupata da altre corsie):
   `env NODE_ENV= npm run dev -- -p 3010` (lasciala viva in background).
2. Screenshot di una pagina: `npx playwright screenshot --viewport-size=1280,800 \
   http://localhost:3010/login tmp/design/login.png` (e variante mobile 390x844).
   Per pagine dietro login: usa playwright con storageState oppure fotografa gli stati
   pubblici e i componenti via pagina di test temporanea (non committarla).
3. LEGGI lo screenshot (Read del PNG), critica con occhio da designer: gerarchia, spaziatura,
   allineamenti, contrasto, stati vuoti, coerenza dark mode, tipografia.
4. Correggi nel codice (solo token e componenti ESISTENTI — vedi vincoli), re-screenshot,
   confronta. Itera finché la pagina regge il giudizio "prodotto curato, non template".

## Perimetro (in ordine)

1. /login e /signup (prima impressione)
2. /onboarding (flusso completo, stati e copy)
3. /dashboard (gerarchia delle card, stati vuoti significativi)
4. /istat e /tourist-tax (tabelle leggibili, azioni chiare)
5. Pagina pubblica /checkin/[token] (multilingua: la vedono gli OSPITI — mobile first!)

## Vincoli (D1 è legge)

- UNA identità: Carta & Inchiostro (terracotta/avorio/Fraunces). VIETATO: nuove palette,
  nuove font, librerie UI nuove. Solo i token in globals.css e i componenti in components/ui.
- Micro-interazioni sobrie (transizioni esistenti), niente animazioni pesanti.
- NON toccare PR #52 (design system foundation, in review umana) né i suoi file se possibile;
  se devi toccare componenti condivisi, modifiche minime e atomiche.
- NON toccare: prisma/, src/server/ (le altre corsie ci lavorano).
- Accessibilità: ogni fix visivo mantiene/migliora focus visibili, label, contrasto AA.

## Output e merge

- PR con gli screenshot PRIMA/DOPO incollati nella descrizione (gh pr create --body con
  immagini caricate: `gh pr create` poi commenta con le immagini via `gh pr comment -F`
  oppure carica in repo tmp/design e linka — NO: tmp è gitignored; usa i commenti PR).
- Micro-polish (spaziature, copy, stati) → merge se CI verde. Cambi visivi GROSSI →
  PR aperta senza merge, decide Gianluca con gli screenshot davanti.
- Screenshot locali in tmp/design/ (gitignored), MAI committati.

## Definition of done

Le 5 aree passate col loop visivo · PR con before/after · CI verde · NIGHT-LOG aggiornato
con giudizio sintetico per pagina (cosa era debole, cosa hai cambiato).

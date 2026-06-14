# Movimento turistico ISTAT — sistemi regionali e architettura Norma

> Ricerca del 2026-06-14 (web, multi-fonte). Dominio frammentato e in evoluzione:
> le voci a **confidenza media/bassa** vanno confermate con fonte ufficiale o col cliente
> prima di scriverci un adapter. Distinto da Alloggiati Web (Polizia, nazionale) e dalla
> tassa di soggiorno.

## Risposta secca

- **Ross1000 NON è solo-Lazio**: è lo standard **de-facto** (fornitore **GIES S.r.l.**, indicato dal
  MITUR come piattaforma di riferimento). Adottato da **~13 regioni ≈ 70% delle strutture**.
  Il Lazio è l'ultimo grande adottante (RADAR dismesso, Ross1000 unico canale dal 21/05/2025).
- **Nessun formato nazionale imposto** per legge (raccolta delegata alle Regioni come organi SISTAN),
  **ma** il tracciato **XML Ross1000** (`<movimenti>/<movimento>`, `<codice>`+`<prodotto>`, file `.xml`/`.txt`)
  è lo standard di fatto. Modello logico comune sotto tutto: **ISTAT C/59** (mensile + giornaliero).

## Mappa di copertura

Confidenza: **A** alta (fonte ufficiale) · **M** media (sistema probabile, dettaglio non confermato) · **B** bassa (da verificare).

| Regione / PA          | Sistema                                                     | Formato                                                               | Conf.       |
| --------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------- | ----------- |
| Piemonte              | Piemonte Dati Turismo (**Ross1000**)                        | XML/TXT/web service                                                   | A           |
| Valle d'Aosta         | VIT Albergatori (proprietario)                              | file ignoto                                                           | M           |
| Lombardia             | Turismo5 (= Ross1000, infra ServiziRL)                      | XML/TXT; web service da confermare                                    | A           |
| Liguria               | RIMOVCLI (alberghiero) **+ Ross1000** (extra-alb.)          | XML giornaliero / Ross1000                                            | A           |
| Veneto                | **Ross1000**                                                | XML/TXT/web service                                                   | A           |
| Emilia-Romagna        | **Ross1000** (ex Turismo5)                                  | XML/TXT/web service                                                   | A           |
| Friuli-Venezia Giulia | WebTur (proprietario)                                       | file C/59 non isolato                                                 | M           |
| PA Trento             | STU / Sistema PreSenze                                      | file giornaliero C/59, **non** Ross1000                               | M           |
| PA Bolzano            | Rilevazione ASTAT (ecosistema LTS)                          | server-to-server da software certificato                              | **B**       |
| Toscana               | Misto: Ross1000 (FI/PO/PT) + RiceStat/Motourist/WebCheck-In | Ross1000 + portali provinciali; transizione a Ross1000 dal 30/03/2026 | M           |
| Umbria                | Turismatica / TOLM                                          | file `.txt` tracciato C/59                                            | A           |
| Marche                | **Ross1000** ("Istrice-Ross1000")                           | XML/TXT/web service                                                   | A           |
| Lazio                 | **Ross1000** (sostituisce RADAR dal 21/05/2025)             | XML/TXT/web service                                                   | A           |
| Abruzzo               | SITRA (= Ross1000)                                          | XML/TXT/web service                                                   | A (sistema) |
| Molise                | **Ross1000** (dal 01/12/2025)                               | XML/TXT/web service                                                   | A           |
| Campania              | Sinfonia Turismo SMART (proprietario)                       | portale + **Web API** (PayTourist)                                    | A           |
| Puglia                | SPOT (InnovaPuglia)                                         | **upload file XML** + manuale                                         | A           |
| Basilicata            | SIST (= Turismo5/Ross1000)                                  | XML/TXT/web service                                                   | A           |
| Calabria              | **Ross1000** via SIRDAT                                     | XML/TXT/web service                                                   | A           |
| Sicilia               | Osservatorio Turistico Reg. (proprietario)                  | tracciato record da gestionale                                        | A           |
| Sardegna              | **Ross1000** (ex SIRED, dal 03/04/2023)                     | XML/TXT/web service                                                   | A           |

## Raggruppamenti (= quanti adapter servono davvero)

- **Cluster A — Ross1000 / XML GIES (13 regioni, 1 solo formato):** Piemonte, Lombardia\*, Liguria,
  Veneto, Emilia-Romagna, Toscana (parz.), Marche, Lazio, Abruzzo, Molise, Basilicata, Calabria,
  Sardegna. Stesso payload XML — già implementato in `istat/ross1000/tracciato-xml.ts`. Differiscono
  solo per `<codice>` struttura, branding portale, e modalità di consegna.
- **Cluster B — proprietari file-based** (un serializer ciascuno, stesso modello C/59):
  Liguria-RIMOVCLI (XML), Puglia-SPOT (XML), Umbria-Turismatica (`.txt`), Sicilia (tracciato record).
- **Cluster C — web/API-only, nessun formato file pubblico:** Campania-Sinfonia (Web API),
  VdA-VIT, FVG-WebTur, PA Trento-STU, PA Bolzano-ASTAT. Niente serializer finché non c'è la spec → **fallback ASSISTITO**.

## Architettura Norma (2 assi)

1. **FORMATO (serializer):** interfaccia comune `serialize(movimenti C/59) → { filename, mimeType, content }`.
   - `Ross1000XmlSerializer` → **già esiste** (`buildMovimentiXml`), copre il Cluster A.
   - su domanda: `RimovcliXmlSerializer`, `SpotXmlSerializer`, `TurismaticaTxtSerializer`, `SiciliaTracciatoSerializer`.
   - Tutti consumano lo stesso output di `computeMovimenti` → l'aggregazione non si tocca mai.
2. **CANALE (consegna):** port `TourismPortalChannel` (esistente). `FILE_EXPORT` default universale
   (download + l'operatore carica al portale regionale); `WEB_SERVICE` per-regione solo con endpoint+credenziali.
3. **Tabella routing** `regione → { serializerId, channelMode, isImplemented, status }` con stato esplicito in UI:
   - **AUTO** (web service), **FILE** (scarica e carica), **ASSISTITO** (numeri pronti, inserimento manuale).
   - Mai far credere all'utente che invii in automatico dove non lo fa.

**Leva:** 1 serializer (Ross1000 XML) + `FILE_EXPORT` = **13 regioni / ~70% strutture, subito**.
+3 serializer file-based → quasi tutto il file-based. Web service automatici: incrementali, guidati dai piloti.
Cluster C / formati ignoti → report C/59 leggibile (CSV per-provenienza, già base nel modulo `istat`) come compilazione assistita.

## Da confermare (non accertato dal web)

- Formati dei portali proprietari Cluster C (VdA, FVG, Trento, Bolzano): servono spec ufficiale o file di esempio del cliente.
- **PA Bolzano**: possibile **certificazione software** richiesta per inviare (barriera reale) — da verificare.
- Toscana province (RiceStat/Motourist): formati non documentati, assetto in transizione a Ross1000 (30/03/2026 da confermare).
- N° esatto regioni Ross1000 (11–13): adozioni recentissime (Molise 12/2025, Lazio 05/2025) da verificare "a regime".
- Lombardia: payload Ross1000-compatibile confermato; **web service per terzi** verso ServiziRL non confermato (potrebbe restare upload manuale).
- Il `<codice>` struttura è assegnato da ogni ente con regole proprie → va raccolto in onboarding per-property, **mai inferito**.

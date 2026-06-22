export const meta = {
  name: 'lead-gen-norma',
  description: 'Genera una pipeline di lead B2B (property manager affitti brevi in Italia) via fan-out di agenti di ricerca web, con verifica anti-allucinazione e dedup per dominio.',
  whenToUse: 'Quando serve costruire o ampliare la lista di property manager italiani per la campagna Norma (Alloggiati + Turismo). Adatta REGIONS/SOURCES e rilancia.',
  phases: [
    { title: 'Harvest', detail: 'un agente per regione + fonti (AIGAB, Pagine Gialle, catene)' },
    { title: 'Dedup', detail: 'merge e dedup per dominio (in-script, no agenti)' },
  ],
}

// ── ICP della campagna (vedi memory: pivot-turismo-alloggiati) ────────────────
// Property manager / gestori affitti brevi con P.IVA + sito, in tutta Italia.
// Solo aziende REALI con sito funzionante: gli agenti devono fetchare ogni sito.

const REGIONS = [
  ['Lazio', 'Roma, Civitavecchia, Gaeta, Sperlonga, Viterbo, Fiumicino, Frascati'],
  ['Lombardia', 'Milano, Como, Bergamo, Brescia, Sirmione, Bormio, Mantova, Lecco'],
  ['Toscana', 'Firenze, Pisa, Siena, Lucca, Forte dei Marmi, Viareggio, Arezzo, Chianti'],
  ['Veneto', 'Venezia, Verona, Padova, Jesolo, Bardolino, Cortina, Caorle, Bibione'],
  ['Campania', 'Napoli, Sorrento, Amalfi, Positano, Capri, Ischia, Procida, Salerno'],
  ['Emilia-Romagna', 'Bologna, Rimini, Riccione, Cervia, Cesenatico, Cattolica, Parma'],
  ['Sicilia', 'Palermo, Catania, Taormina, Siracusa, Cefalu, Trapani, Ragusa, Noto'],
  ['Sardegna', 'Cagliari, Olbia, Porto Cervo, Alghero, Villasimius, San Teodoro, Budoni'],
  ['Liguria', 'Genova, La Spezia, Cinque Terre, Sanremo, Rapallo, Alassio, Portofino'],
  ['Puglia', 'Bari, Lecce, Ostuni, Polignano, Gallipoli, Vieste, Monopoli, Otranto'],
  ['Piemonte', 'Torino, Alba, Langhe, Stresa, Lago Maggiore, Sestriere, Asti'],
  ['Trentino-Alto Adige', 'Bolzano, Trento, Merano, Val Gardena, Madonna di Campiglio, Canazei'],
  ['Marche', 'Ancona, Senigallia, Pesaro, San Benedetto del Tronto, Urbino, Fano'],
  ['Umbria', 'Perugia, Assisi, Gubbio, Orvieto, Spoleto, Todi, Trasimeno'],
  ['Calabria', 'Reggio Calabria, Tropea, Scilla, Cosenza, Pizzo, Capo Vaticano'],
  ['Abruzzo', 'Pescara, L Aquila, Roccaraso, Vasto, Giulianova, Alba Adriatica'],
  ['Friuli-Venezia Giulia', 'Trieste, Udine, Lignano, Grado, Gorizia'],
  ['Valle d Aosta', 'Aosta, Courmayeur, Cervinia, La Thuile'],
  ['Basilicata', 'Matera, Maratea, Potenza'],
  ['Molise', 'Campobasso, Termoli, Isernia'],
]

const SOURCES = [
  ['aigab', 'i soci/operatori delle associazioni di gestori affitti brevi: AIGAB (aigab.it, pagina soci/board), Property Managers Italia, AIGO, Federalberghi Extra. Segui i link ai siti dei soci.'],
  ['paginegialle', 'elenchi tipo Pagine Gialle / Virgilio / Misterimprese per "gestione affitti brevi / case vacanza" nelle grandi citta (Roma, Milano, Bologna, Torino, Verona, Rimini, Bari).'],
  ['catene', 'catene e gruppi nazionali (CleanBnB, Italianway, Halldis, Wonderful Italy, Joivy, Welcomely, Sweetstay, Dimora Italia, ecc.) verificati sul sito reale, + classifiche "migliori property manager affitti brevi Italia".'],
]

const SCHEMA = {
  type: 'object',
  required: ['companies'],
  properties: {
    companies: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'website', 'city', 'region', 'phone', 'email', 'note', 'source_url'],
        properties: {
          name: { type: 'string' }, website: { type: 'string' }, city: { type: 'string' },
          region: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' },
          note: { type: 'string' }, source_url: { type: 'string' },
        },
      },
    },
  },
}

const RULES = `Includi un'azienda SOLO se l'hai trovata davvero con un sito web reale e funzionante: FETCHA il sito per confermarlo. NON inventare, NON indovinare nomi o domini. Preferisci gestori locali indipendenti (ICP: chiunque con P.IVA + sito), includi gestione B&B/case vacanza. Niente duplicati interni. Usa "" per i campi mancanti, mai dati inventati.`

function regionPrompt(region, towns) {
  return `Sei un ricercatore di lead B2B per Norma (SaaS compliance affitti brevi Italia: schedine Alloggiati + tassa di soggiorno/ISTAT). Trova AZIENDE REALI di property management / gestione affitti brevi / case vacanza (gestori, NON portali) attive in ${region}. Citta chiave: ${towns}. Usa ricerca web e fetch. ${RULES} region = "${region}". Target: fino a 70 aziende reali.`
}
function sourcePrompt(what) {
  return `Sei un ricercatore di lead B2B per Norma (compliance affitti brevi Italia). Trova ${what} Usa ricerca web e fetch. ${RULES} Target: fino a 100 aziende reali.`
}

function domainOf(url) {
  if (!url) return ''
  let u = url.trim(); if (!u.startsWith('http')) u = 'https://' + u
  try { let h = new URL(u).hostname.toLowerCase(); return h.startsWith('www.') ? h.slice(4) : h } catch { return '' }
}

phase('Harvest')
const regionResults = await parallel(
  REGIONS.map(([region, towns]) => () =>
    agent(regionPrompt(region, towns), { label: `region:${region}`, phase: 'Harvest', schema: SCHEMA })))
const sourceResults = await parallel(
  SOURCES.map(([key, what]) => () =>
    agent(sourcePrompt(what), { label: `source:${key}`, phase: 'Harvest', schema: SCHEMA })))

phase('Dedup')
const all = [...regionResults, ...sourceResults].filter(Boolean).flatMap(r => r.companies || [])
const seen = new Map()
for (const c of all) {
  const d = domainOf(c.website || c.source_url)
  if (!d) continue
  const prev = seen.get(d)
  const score = x => (x.email ? 2 : 0) + (x.phone ? 1 : 0) + (x.note ? x.note.length / 200 : 0)
  if (!prev || score(c) > score(prev)) seen.set(d, { ...c, _domain: d })
}
const companies = [...seen.values()]
log(`raccolti ${all.length} grezzi → ${companies.length} unici per dominio`)
return { total: companies.length, companies }

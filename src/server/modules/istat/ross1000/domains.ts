// Domini ufficiali del tracciato Ross1000 (GIES) per i campi <tipoturismo> e <mezzotrasporto> di <arrivo>.
// Fonte: "Tracciato Record di Integrazione Dati (XML) — Istruzioni per le software house", GIES v3
// (18/03/2026), ross1000.it; replicato dai portali regionali (Emilia-Romagna v2.4, Veneto, Piemonte,
// Sardegna). Enumerazione CHIUSA e obbligatoria: i valori fuori lista rischiano il rifiuto del portale.
//
// `value` = stringa da inviare nel tracciato (MAIUSCOLO, come negli esempi XML ufficiali).
// `label` = grafia leggibile per la UI. `ALTRO MOTIVO`/`ALTRO MEZZO` = catch-all ufficiali;
// `NON SPECIFICATO` = fallback ufficiale. Unica fonte di verità: usata dal form di check-in e
// (in futuro) dal serializer di export, così l'invio combacia con ciò che si raccoglie.
//
// ⚠️ DA VERIFICARE PRIMA DEL LIVE (non documentato dal tracciato): regola di matching esatta
// (case-sensitive? grafia mista?), accettazione dei separatori "+"/"/", ed eventuali varianti
// dell'elenco nella regione del cliente pilota. Confermare con un invio di prova sul portale.

export interface Ross1000Option {
  value: string;
  label: string;
}

export const TIPO_TURISMO_OPTIONS: readonly Ross1000Option[] = [
  { value: "CULTURALE", label: "Culturale" },
  { value: "BALNEARE", label: "Balneare" },
  { value: "CONGRESSUALE/AFFARI", label: "Congressuale/Affari" },
  { value: "FIERISTICO", label: "Fieristico" },
  { value: "SPORTIVO/FITNESS", label: "Sportivo/Fitness" },
  { value: "SCOLASTICO", label: "Scolastico" },
  { value: "RELIGIOSO", label: "Religioso" },
  { value: "SOCIALE", label: "Sociale" },
  { value: "PARCHI TEMATICI", label: "Parchi Tematici" },
  { value: "TERMALE/TRATTAMENTI SALUTE", label: "Termale/Trattamenti salute" },
  { value: "ENOGASTRONOMICO", label: "Enogastronomico" },
  { value: "CICLOTURISMO", label: "Cicloturismo" },
  { value: "ESCURSIONISTICO/NATURALISTICO", label: "Escursionistico/Naturalistico" },
  { value: "ALTRO MOTIVO", label: "Altro motivo" },
  { value: "NON SPECIFICATO", label: "Non specificato" },
];

export const MEZZO_TRASPORTO_OPTIONS: readonly Ross1000Option[] = [
  { value: "AUTO", label: "Auto" },
  { value: "AEREO", label: "Aereo" },
  { value: "AEREO+PULLMAN", label: "Aereo+Pullman" },
  { value: "AEREO+NAVETTA/TAXI/AUTO", label: "Aereo+Navetta/Taxi/Auto" },
  { value: "AEREO+TRENO", label: "Aereo+Treno" },
  { value: "TRENO", label: "Treno" },
  { value: "PULLMAN", label: "Pullman" },
  { value: "CARAVAN/AUTOCARAVAN", label: "Caravan/Autocaravan" },
  { value: "BARCA/NAVE/TRAGHETTO", label: "Barca/Nave/Traghetto" },
  { value: "MOTO", label: "Moto" },
  { value: "BICICLETTA", label: "Bicicletta" },
  { value: "A PIEDI", label: "A piedi" },
  { value: "ALTRO MEZZO", label: "Altro mezzo" },
  { value: "NON SPECIFICATO", label: "Non Specificato" },
];

const TIPO_TURISMO_VALUES: ReadonlySet<string> = new Set(TIPO_TURISMO_OPTIONS.map((o) => o.value));
const MEZZO_TRASPORTO_VALUES: ReadonlySet<string> = new Set(
  MEZZO_TRASPORTO_OPTIONS.map((o) => o.value),
);

export function isValidTipoTurismo(v: string): boolean {
  return TIPO_TURISMO_VALUES.has(v);
}
export function isValidMezzoTrasporto(v: string): boolean {
  return MEZZO_TRASPORTO_VALUES.has(v);
}

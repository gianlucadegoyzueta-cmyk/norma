// Contenuti della landing pubblica (marketing). Testo di dominio in italiano; struttura ispirata
// a mimprep.com e adattata a Norma (compliance affitti brevi · Alloggiati Web).
import {
  AlarmClock,
  BarChart3,
  Building2,
  KeyRound,
  Landmark,
  Receipt,
  Send,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** "Il nostro vantaggio" — sei punti di forza del prodotto. */
export const FEATURES: Feature[] = [
  {
    icon: Send,
    title: "Invio automatico ad Alloggiati Web",
    description:
      "Norma parla direttamente con il web service della Polizia di Stato: genera il tracciato, lo valida e invia le schedine al posto tuo. Niente copia-incolla nel portale.",
  },
  {
    icon: ShieldCheck,
    title: "Mai un doppione, mai un'omissione",
    description:
      "L'invio ad Alloggiati è irreversibile. Il motore outbox di Norma garantisce che ogni ospite venga inviato una sola volta, anche se la rete cade a metà.",
  },
  {
    icon: KeyRound,
    title: "Credenziali sempre cifrate",
    description:
      "Utente, password e WSKey non sono mai salvati in chiaro: passano da un vault cifrato. Solo Norma le usa, al momento dell'invio.",
  },
  {
    icon: Building2,
    title: "Multi-struttura e multi-credenziale",
    description:
      "Gestisci più appartamenti e più credenziali Questura da un'unica dashboard, con i dati di ogni organizzazione rigorosamente isolati.",
  },
  {
    icon: AlarmClock,
    title: "Scadenze sotto controllo",
    description:
      "Le 24 ore (o 6 per i soggiorni brevi) sono calcolate per te. Norma ti mostra cosa è urgente e cosa è già al sicuro, prima che diventi una sanzione.",
  },
  {
    icon: Receipt,
    title: "Ricevute e riconciliazione",
    description:
      "Ogni invio viene tracciato e riconciliato con la ricevuta del giorno successivo: hai sempre la prova di cosa è stato acquisito, e quando.",
  },
];

export interface ProductModule {
  icon: LucideIcon;
  name: string;
  description: string;
  status: "attivo" | "in arrivo";
}

/** "Prodotti / moduli" — le aree di adempimento coperte (o in arrivo). */
export const MODULES: ProductModule[] = [
  {
    icon: Send,
    name: "Alloggiati Web",
    description:
      "Invio automatico delle schedine alloggiati alla Polizia di Stato, con validazione del tracciato e protezione anti-doppione.",
    status: "attivo",
  },
  {
    icon: Landmark,
    name: "Tassa di soggiorno",
    description:
      "Calcolo degli importi per ospite e per notte, gestione delle esenzioni e riepiloghi pronti per il versamento al Comune.",
    status: "in arrivo",
  },
  {
    icon: BarChart3,
    name: "ISTAT · Flussi turistici",
    description:
      "Comunicazione delle presenze ai portali turistici regionali e a ISTAT, partendo dagli stessi dati ospiti già inseriti.",
    status: "in arrivo",
  },
];

export interface Step {
  title: string;
  description: string;
}

/** "Come funziona" — il percorso dell'utente in sei passi. */
export const STEPS: Step[] = [
  {
    title: "Collega la credenziale",
    description:
      "Inserisci una volta le credenziali Alloggiati Web della tua Questura: Norma le custodisce cifrate e verifica subito che funzionino.",
  },
  {
    title: "Aggiungi le strutture",
    description:
      "Registra i tuoi appartamenti con provincia e dati richiesti. Ogni struttura è associata alla credenziale giusta.",
  },
  {
    title: "Inserisci gli ospiti",
    description:
      "Aggiungi il soggiorno e gli ospiti — singoli, famiglie o gruppi. Norma riconosce capofamiglia, familiari e ospiti stranieri.",
  },
  {
    title: "Genera le schedine",
    description:
      "Dai dati dell'ospite Norma costruisce il tracciato ufficiale, già validato secondo le regole della Polizia di Stato.",
  },
  {
    title: "Invia e ricevi conferma",
    description:
      "Con un clic (o in automatico) le schedine partono verso Alloggiati Web. Vedi l'esito riga per riga: acquisita, da correggere o da verificare.",
  },
  {
    title: "Archivia e riconcilia",
    description:
      "Norma conserva lo storico e concilia gli invii con la ricevuta T+1: archivio sempre pronto in caso di controllo.",
  },
];

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

/** Testimonianze brevi (illustrative). */
export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Prima passavo le domeniche a copiare dati nel portale della Polizia. Ora gli ospiti arrivano e le schedine partono da sole.",
    name: "Giulia M.",
    role: "Host · Roma",
  },
  {
    quote:
      "Gestisco 14 appartamenti per conto di altri proprietari: Norma tiene separate le credenziali e non sbaglia un invio.",
    name: "Davide R.",
    role: "Property manager · Firenze",
  },
  {
    quote:
      "La cosa che mi ha convinto è la sicurezza: nessun rischio di doppione, e ho sempre la prova di cosa ho inviato.",
    name: "Chiara B.",
    role: "Host · Milano",
  },
  {
    quote:
      "Configurato in cinque minuti. Il primo check-in l'ho mandato dallo smartphone, in spiaggia.",
    name: "Luca P.",
    role: "Host · Cagliari",
  },
  {
    quote: "Le scadenze erano il mio incubo. Adesso vedo subito cosa è urgente e dormo tranquillo.",
    name: "Sara T.",
    role: "Host · Bologna",
  },
  {
    quote:
      "Avevo paura della parte tecnica con la Questura. Norma ha reso tutto banale, anche per chi non è del mestiere.",
    name: "Marco V.",
    role: "Gestore B&B · Napoli",
  },
];

/** Storie più lunghe in evidenza. */
export const STORIES: Testimonial[] = [
  {
    quote:
      "Gestisco affitti brevi da sei anni e la registrazione ospiti è sempre stata la parte più ansiogena: un errore di battitura sul portale o una schedina dimenticata possono costare una sanzione. Con Norma carico l'ospite, controllo l'anteprima e invio. Quando una volta è saltata la connessione a metà invio, il sistema non ha ritentato alla cieca: il giorno dopo ha riconciliato da solo con la ricevuta. Per me è esattamente il livello di affidabilità che serve quando si parla di Polizia di Stato.",
    name: "Federica L.",
    role: "Host · 4 appartamenti, Verona",
  },
  {
    quote:
      "Come agenzia gestiamo decine di strutture di proprietari diversi, ciascuna con la sua credenziale di Questura. Prima usavamo fogli di calcolo e promemoria. Norma ha messo ordine: ogni proprietario è isolato, ogni invio è tracciato e archiviato, e il team vede a colpo d'occhio cosa manca. Abbiamo azzerato gli invii dimenticati.",
    name: "Studio Soggiorni Brevi",
    role: "Agenzia · Toscana",
  },
];

// Email pubblica per i contatti (l'app non ha un form: il primo messaggio passa da qui).
const CONTACT_EMAIL = "ciao@norma.casa";

// mailto precompilato per il piano Pro (agenzie): il primo contatto arriva già qualificato,
// senza form né backend. Coerente con il sito di marketing (norma.casa).
const PRO_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  "Norma Pro — agenzia / property manager",
)}&body=${encodeURIComponent(
  [
    "Ciao Norma,",
    "",
    "Sono un'agenzia / property manager.",
    "Numero di strutture: ",
    "Numero di immobili: ",
    "Città / zona: ",
    "",
    "Vorrei capire come funziona il piano Pro.",
  ].join("\n"),
)}`;

/** Note trasversali della sezione Prezzi. */
export const PRICING = {
  trial: "14 giorni di prova gratuita",
  trialNote: "Senza carta di credito. Disdici quando vuoi.",
  vatNote: "I prezzi si intendono IVA inclusa.",
};

export interface PricingPlan {
  name: string;
  /** Prezzo già formattato ("€12" oppure "Su misura"). */
  price: string;
  /** Unità accanto al prezzo, se applicabile ("/ mese"). */
  priceUnit?: string;
  /** Etichetta a destra del nome ("1–4 immobili", "Agenzie"). */
  scope: string;
  tagline: string;
  /** Il piano consigliato è evidenziato. */
  highlighted: boolean;
  cta: { label: string; href: string };
  features: string[];
}

/**
 * Piani coerenti con il sito di marketing (norma.casa): Host a prezzo fisso, Pro su misura.
 * Le feature del piano Host descrivono ciò che l'app fa DAVVERO oggi (niente promesse vuote).
 */
export const PRICING_PLANS: PricingPlan[] = [
  {
    name: "Host",
    price: "€12",
    priceUnit: "/ mese",
    scope: "1–4 immobili",
    tagline: "Per chi gestisce i propri affitti brevi. Nessun costo per singolo invio.",
    highlighted: true,
    cta: { label: "Inizia la prova gratuita", href: "/login" },
    features: [
      "Invio illimitato ad Alloggiati Web",
      "Validazione del tracciato in tempo reale",
      "Protezione anti-doppione (outbox)",
      "Credenziali cifrate nel vault",
      "Gestione multi-struttura",
      "Avvisi su scadenze 24h / 6h",
      "Archivio invii e ricevute",
      "Riconciliazione automatica T+1",
    ],
  },
  {
    name: "Pro",
    price: "Su misura",
    scope: "Agenzie",
    tagline: "Per property manager e agenzie che gestiscono molte strutture.",
    highlighted: false,
    cta: { label: "Parliamone", href: PRO_MAILTO },
    features: [
      "Tutto del piano Host",
      "Più immobili e più strutture",
      "Più credenziali Alloggiati Web",
      "Fatturazione e condizioni dedicate",
      "Onboarding assistito",
    ],
  },
];

export interface Faq {
  question: string;
  answer: string;
}

export const FAQS: Faq[] = [
  {
    question: "Cos'è Norma, in breve?",
    answer:
      "Norma è un servizio che automatizza la compliance degli affitti brevi in Italia. Registra gli ospiti e invia le schedine ad Alloggiati Web (Polizia di Stato) al posto tuo, tenendo traccia di scadenze, esiti e ricevute.",
  },
  {
    question: "Devo dare a Norma le credenziali di Alloggiati Web?",
    answer:
      "Sì, ma vengono salvate cifrate in un vault dedicato e non sono mai visibili in chiaro. Norma le usa solo nel momento dell'invio, per autenticarsi al web service della Polizia di Stato.",
  },
  {
    question: "Cosa succede se l'invio va in errore o cade la connessione?",
    answer:
      "L'invio ad Alloggiati è irreversibile, quindi Norma non ritenta mai alla cieca: se l'esito è incerto la schedina resta \"da verificare\" e viene riconciliata con la ricevuta del giorno successivo, evitando qualsiasi doppione.",
  },
  {
    question: "Posso gestire più appartamenti e più credenziali?",
    answer:
      "Sì. Puoi aggiungere tutte le strutture che vuoi e associarle alla credenziale di Questura corretta. I dati di ogni organizzazione restano isolati.",
  },
  {
    question: "Norma gestisce anche la tassa di soggiorno e l'ISTAT?",
    answer:
      "Il cuore di Norma oggi è l'invio ad Alloggiati Web. Gli adempimenti su tassa di soggiorno e flussi turistici regionali/ISTAT sono nella nostra roadmap: l'archivio dati è già pronto per supportarli.",
  },
  {
    question: "Quanto ci vuole per iniziare?",
    answer:
      "Pochi minuti: colleghi la credenziale, aggiungi una struttura e sei pronto a inviare la prima schedina. C'è una guida passo-passo che ti accompagna al primo invio.",
  },
];

# Registro difetti — Norma (giuria critici, 2026-06-23)

> **Aggiornamento 2026-06-26 (piano Ordine ecosistema):** verità editoriale migrata a `docs/EDITORIAL.md` — pitch **"Norma esegue per te su mandato"** (non più "prepara/confermi"). Interventi #1 e tono app in Top 10 vanno riletti alla luce di EDITORIAL; molti fix copy/CTA/deploy sono in corso su `norma-marketing` e `norma`.

**Conteggi:** Sito: 4 BLOCKER, 13 MAJOR, 12 MINOR, 5 POLISH (34 difetti deduplicati). App: 5 BLOCKER, 17 MAJOR, 18 MINOR, 10 POLISH (50 difetti deduplicati). Totale: 9 BLOCKER, 30 MAJOR, 30 MINOR, 15 POLISH = 84 difetti unici su 12 report.

## Verdetto sito

Il sito è già di livello buono-alto (palette terracotta/avorio coerente, Fraunces ben usato, ritmo verticale generoso, zero errori console, ottime fondamenta SEO/perf e a11y sopra la media) ma NON è premium senza riserve. Tre crepe sono strategiche e bloccanti: (1) il claim hero gigante 'sparita' + CTA 'Al resto pensa Norma' contraddicono la verità editoriale vincolante 'Norma prepara, tu confermi — mai invia da sola'; (2) deploy disallineato — la /prezzo LIVE è una build vecchia (2 tier 'Host/Pro', headline 'Un prezzo onesto') diversa dal codice in repo (3 tier + scaglioni + anti-fee), e il listino è incoerente tra home (1 piano €90), /prezzo (3 tier) e CLAUDE.md app (€120); (3) il funnel di conversione è rotto — i CTA 'Prova gratis' atterrano su /login 'Bentornato' (login, non signup), manca lo skip link (WCAG A) e la headline non supera il test dei 5 secondi. Sotto: gestione obiezioni e prova sociale assenti senza surrogati, contrasti AA esattamente al limite con vari casi sotto soglia, sei etichette CTA per due azioni, raggi e bottoni non standardizzati. Verdetto: premium 'quasi', con 4 BLOCKER e una decina di MAJOR da chiudere prima di dichiararlo finito.

## Verdetto app

Il redesign 'Concierge MAX' è visivamente ambizioso e in alcuni punti (dashboard, hero ink-reveal, odometro, KPI con tilt) raggiunge il livello 'SaaS da €€€', con basi mature su stati (empty/loading/error/success curati, guard sull'invio irreversibile esemplare) e buone fondamenta a11y. MA è a metà strada tra prodotto premium e prototipo. Difetto capitale e ripetutamente confermato: la navigazione globale è amputata — non esiste sidebar e SiteHeader/CommandPalette/MobileNav sono codificati ma montati SOLO in page-skeleton.tsx (loading), quindi sull'app live mancano command palette, bottom-bar mobile e header persistente; tra sezioni si naviga solo col link '← Dashboard', un vicolo cieco. La verità editoriale è violata in modo sistematico e grave: la dashboard e /schedine fanno parlare Norma come agente autonomo ('Decidi tu, eseguo io', 'Stanotte ho sistemato', 'Norma può inviare da sola') contro 'mai invia da sola', pericoloso su un prodotto di compliance gated a decisione umana. Il design-system è strutturalmente rotto (due sistemi paralleli cmx-\* e shadcn, stesso stato reso diversamente), il dark mode è vietato ma vivo nel codice in più file, contrasti salvia/trend/badge sotto AA, opzioni check-in non tradotte per ospiti EN/DE/FR/ES, e mobile desktop-first (input a 14px che zooma iOS, target sotto 44px, KPI che strabordano a 390px). Verdetto: bello ma si naviga male, con difetti di coerenza e di tono che un occhio esperto nota subito.

## Top 10 interventi

1. SITO/APP — Riallineare il tono alla verità editoriale 'Norma prepara, tu confermi — mai invia da sola': cambiare H1 hero sito ('sparita'→'già pronta, tu confermi'), CTA finale ('Al resto pensa Norma'→'Tu accogli. Norma prepara.'), OG/meta description ('fa al posto tuo'→'tu confermi con un click'), e i testi app dashboard/schedine ('Decidi tu, eseguo io', 'Stanotte ho sistemato', 'Norma può inviare da sola'). È un BLOCKER editoriale ripetuto su entrambe le superfici e un rischio di claim non veritiero su un prodotto di compliance.
1. APP — Montare una navigazione globale persistente (sidebar/nav-rail desktop + SiteHeader con CommandPalette + MobileNav) in un layout autenticato condiviso, così che ⌘K, header e bottom-bar siano presenti su TUTTE le rotte protette e non solo nel flash di loading. Senza questo l'app è un insieme di pagine scollegate con vicoli ciechi: è il difetto più grave, segnalato come BLOCKER da 4 critici.
1. SITO — Ri-deployare il marketing su Vercel così che /prezzo LIVE rifletta il codice, e fissare UNA sola architettura di prezzo (numero di tier, naming, €90 vs €120) usata identica in home, /prezzo, /per-property-manager e CLAUDE.md app. Oggi prod e repo divergono e il prezzo comunicato può essere errato.
1. SITO — Riparare il funnel di signup: puntare i CTA di acquisizione a una route dedicata ('Crea il tuo account'/'Inizia gratis') invece di /login 'Bentornato', e unificare un solo metodo (magic-link O password) coerente tra lib/site.ts e la pagina live.
1. SITO — Aggiungere lo skip link 'Salta al contenuto' (WCAG 2.4.1 Level A, oggi assente, confermato live e nel codice) come primo elemento focusabile con id+tabIndex sul <main>; correggere anche il menu mobile (Escape, focus trap, ritorno focus).
1. APP — Rimuovere il dark mode morto e contraddittorio: eliminare il blocco .dark da globals.css, le utility dark:\* dai ~8 file, e forzare color-scheme: light only. Vietato dal brand (#97) ma vivo nel codice, rischia di rompere identità e controlli nativi (input date/autofill) su OS in dark.
1. SITO/APP — Risolvere i contrasti sotto/al limite AA: scurire il terracotta per testo piccolo/link/eyebrow/CTA (verso #9e3d22 ~6:1), il salvia per testo/badge/trend (~#4f6043+), rimuovere le opacity sul testo della pricing card terracotta, e dare un focus ring chiaro sulle CTA su sfondo scuro. Più casi misurati esattamente a 4.5 o sotto, su entrambe le superfici.
1. APP — Unificare il design system: scegliere UN solo sistema di badge/bottoni/liste (preferibilmente i primitivi shadcn brandizzati) e rifattorizzare cmx-\* + schedina-status-display.ts, così che lo stesso stato ('Pronta', 'Acquisita') abbia lo stesso colore ovunque (oggi verde su /istat, neutro su /schedine e /tourist-tax).
1. SITO/APP — Standardizzare la CTA primaria su un'unica label per il signup (es. 'Inizia gratis'), centralizzata in lib/site.ts, eliminando le 5-6 varianti diverse per la stessa azione su entrambe le superfici; tenere distinta solo la secondaria (contatto/PM).
1. APP — Tradurre le opzioni delle tendine check-in (Tipo di turismo, Mezzo di trasporto) e localizzare i nomi Paese/Comune per gli ospiti EN/DE/FR/ES, e applicare il font 16px ai campi mobile (oggi 14px → auto-zoom iOS): è il flusso pubblico più usato da telefono.

## SITO — 41 difetti

### [BLOCKER] Il claim hero contraddice la verità editoriale vincolante ('mai invia da sola')

- **Dove:** https://norma.casa H1 hero — app/page.tsx:75-79 (RevealText accent='sparita.'); CTA finale 'Al resto pensa Norma'
- **Problema:** Il titolo dominante (~75px) dice che la burocrazia è 'sparita' (svanita da sola) e la CTA finale 'Al resto pensa Norma' rafforza il 'lo fa lei', contro la regola vincolante 'Norma prepara, tu confermi con un click — mai invia da sola'. Il sottotitolo corregge ma l'occhio legge prima il display: messaggio forte sbagliato e rischioso (promessa di automazione totale che il prodotto non mantiene). Segnalato indipendentemente da 3 critici.
- **Fix:** Cambiare l'accento dell'H1 in un verbo coerente: 'La burocrazia degli affitti brevi, già pronta.' / 'preparata, tu confermi.'. Allineare la CTA finale a 'Tu accogli. Norma prepara.'. Mantenere 'sparita' al massimo come sottotitolo emotivo, mai come prima cosa letta.

### [BLOCKER] Deploy disallineato: /prezzo LIVE (2 tier) ≠ codice repo (3 tier)

- **Dove:** https://norma.casa/prezzo (LIVE) vs app/prezzo/page.tsx + lib/pricing.ts
- **Problema:** La produzione mostra 'Un prezzo onesto. Senza sorprese.' con DUE card (Host €90 + Pro €72 'Agenzie'), senza Host+, senza tabella scaglioni né sezione anti-fee. Il codice in repo ha 'Un prezzo piatto', TRE tier (Host €90/Host+ €78/Property manager €72), scaglioni e PriceComparator. La home è già aggiornata: home e /prezzo sono fuori sincrono e i fix sul codice non raggiungono l'utente.
- **Fix:** Ri-deployare norma-marketing su Vercel così che /prezzo LIVE rifletta lib/pricing.ts. Allineare prod e codice PRIMA di qualunque altra critica su /prezzo; verificare in prod dopo il deploy.

### [BLOCKER] Listino incoerente tra home (1 piano €90), /prezzo (3 tier) e CLAUDE.md app (€120)

- **Dove:** app/page.tsx:459-537 + data.tsx:125-132 vs app/prezzo/page.tsx (lib/pricing.ts) vs ~/dev/norma/CLAUDE.md (€120/anno)
- **Problema:** La home vende 'Un unico piano, tutto incluso — Norma Completo €90' poi rimanda a /prezzo con TRE tier; 'un unico piano' è falso rispetto alla destinazione (effetto esca-e-cambio). In più CLAUDE.md app dichiara €120/anno: almeno una verità di prezzo è sbagliata. La home mostra €72 PM senza i €78 Host+: due strutture di listino divergenti.
- **Fix:** Decidere UNA architettura di prezzo e rifletterla ovunque (data.tsx, lib/pricing.ts, CLAUDE.md app). Se i tier sono 3 la home non dice 'un unico piano' ma 'da €72 a €90 per struttura' o mostra i 3 tier. Risolvere €90 vs €120.

### [BLOCKER] Manca lo skip link 'Salta al contenuto' (WCAG 2.4.1 Bypass Blocks, Level A)

- **Dove:** app/layout.tsx (body) e app/page.tsx (<main> senza id); confermato live e nel codice (grep skip/sr-only = 0)
- **Problema:** Non esiste alcun primo elemento focusabile di skip e <main> non ha id: un utente da tastiera/screen reader deve tabbare logo + 5 voci nav + 2 CTA su OGNI pagina prima del contenuto. Violazione Level A confermata live.
- **Fix:** Aggiungere come primo figlio del <body> un <a href='#contenuto' class='sr-only focus:not-sr-only ...'>Salta al contenuto</a>, mettere id='contenuto' + tabIndex={-1} sul <main> in page.tsx e SiteFrame.tsx, e definire la utility sr-only (assente in questo setup Tailwind v4).

### [MAJOR] CTA primaria atterra su /login 'Bentornato' (login, non signup)

- **Dove:** app.norma.casa/login (LOGIN_URL in lib/site.ts) raggiunta da tutti i CTA di home/prezzo/PM
- **Problema:** Tutti i CTA primari ('Prova Norma gratis', 'Inizia ora', 'Prova gratis') puntano a /login, che live mostra 'Bentornato', email+password e 'Accedi'; la registrazione è un link secondario. Un nuovo visitatore convinto a iscriversi atterra su una schermata per chi torna: massima frizione nel punto di conversione più caro. In più lib/site.ts dichiara REGISTER_URL=/login con commento 'magic-link' ma la pagina live ha password.
- **Fix:** Puntare i CTA di acquisizione a una route di signup dedicata ('Crea il tuo account'/'Inizia gratis' come azione primaria). Unificare UN solo metodo (magic-link O password) e rifletterlo nel copy. Verificare REGISTER_URL nel codice app.

### [MAJOR] Headline hero non dice cosa fa né per chi (fallisce il test dei 5 secondi)

- **Dove:** norma.casa hero — app/page.tsx:75-80
- **Problema:** 'La burocrazia degli affitti brevi, sparita.' è uno slogan d'atmosfera: un host non capisce in 5s che si tratta di schedine Polizia + ISTAT + tassa di soggiorno, né che è un SaaS in abbonamento. Sub-headline nomina solo ISTAT e omette la tassa di soggiorno (metà del secondo pilastro).
- **Fix:** Headline concreta e qualificante: 'Schedine alla Polizia, tassa di soggiorno e ISTAT, pronte in un click.' con eyebrow 'Per host e property manager di affitti brevi'. Includere entrambe le facce del pilastro Turismo above-the-fold.

### [MAJOR] Zero gestione obiezioni sul rischio percepito dell'invio alla Polizia

- **Dove:** home, intera pagina (manca una sezione) — app/page.tsx
- **Problema:** L'obiezione numero uno ('e se Norma sbaglia un invio obbligatorio e mi becco una sanzione?') non è gestita: nessuna garanzia, nessun 'cosa succede se un invio fallisce', nessun riferimento art.109 TULPS che mostri competenza.
- **Fix:** Aggiungere un blocco 'E se qualcosa va storto?': garanzia/rimborso, cosa fa Norma se un invio fallisce (valorizzare la riconciliazione T+1 esistente come garanzia), e una riga di autorevolezza normativa (art.109 TULPS).

### [MAJOR] Prova sociale assente trasformata in disclaimer, senza surrogati di fiducia

- **Dove:** home sezione Trasparenza — app/page.tsx:329-379
- **Problema:** 'Norma è agli inizi... non trovi recensioni gonfiate' è onesto ma comunica 'nessuno la usa ancora' senza compensazione. Mancano surrogati legittimi: numero schedine preparate/inviate, host attivi, 'canale Alloggiati Web verificato' (Gate #0 reale), regioni ISTAT coperte, ricevuta reale anonimizzata.
- **Fix:** Affiancare al disclaimer prova concreta e veritiera: contatore invii processati, 'canale ufficiale Alloggiati Web verificato', elenco regioni ISTAT, screenshot ricevuta reale anonimizzata. La trasparenza resta, con una prova positiva accanto.

### [MAJOR] 'Guarda la demo' non è una demo: anchor che scrolla a 3 card di testo

- **Dove:** home hero, secondo CTA — app/page.tsx:100-107 (href='#come-funziona')
- **Problema:** Il bottone 'Guarda la demo' promette una demo ma fa solo scroll a #come-funziona (3 card di solo testo): nessun video, tour o screenshot animato. Promessa disattesa nel primo viewport; il nome del link non descrive la destinazione (WCAG 2.4.4) e il focus da tastiera resta sull'anchor mentre la pagina scrolla (2.4.3).
- **Fix:** O creare una vera demo (loop video/tour cliccabile del flusso check-in→schedina→conferma) e linkarla, o rinominare in 'Scopri/Vedi come funziona' (coerente con l'ancora) e spostare il focus sul target con tabIndex=-1.

### [MAJOR] Tassa di soggiorno presentata come 'inclusa' ma dichiarata 'non disponibile' altrove

- **Dove:** app/prezzo/page.tsx:57-60 + lib/pricing.ts ANTI_FEE_POINTS vs lib/faq.ts (e FAQ live)
- **Problema:** Incoerenza interna che mina la fiducia: /prezzo elenca 'Tassa di soggiorno, incasso incluso' tra i differenziatori mentre la FAQ di brand dichiara che la tassa di soggiorno 'è ancora nella roadmap: non è ancora disponibile'. La tassa di soggiorno è però un pilastro reale e shipped (modulo tourist-tax, #35): il sito declassa una feature vendibile e si contraddice.
- **Fix:** Allineare alla verità del prodotto: la tassa di soggiorno è disponibile (report/CSV/PDF). Riscrivere la FAQ di brand e coerenziare /prezzo. Verificare lo stato reale con Gianluca prima di pubblicare, ma non vendere un beneficio non erogato né declassare uno reale.

### [MAJOR] Prezzo IVA marcato [DA CONFERMARE] in produzione (claim fiscale non verificato)

- **Dove:** app/prezzo/page.tsx:184-187 ('IVA inclusa' con commento [DA CONFERMARE]) + lib/pricing.ts
- **Problema:** La pagina dichiara pubblicamente 'IVA inclusa' mentre il codice porta '[DA CONFERMARE]'. Se in realtà è IVA esclusa è un claim di prezzo errato verso il consumatore (rischio legale/reso): €90 vs €90+IVA cambia la decisione. Rischio HIGH (claim di prezzo).
- **Fix:** Confermare con Gianluca IVA inclusa/esclusa e rimuovere il TODO. Finché non confermato, non affermare 'IVA inclusa'.

### [MAJOR] Funnel commerciale basato su mailto: attrito alto e nessun tracciamento

- **Dove:** lib/site.ts:40-95 (CONTACT/PRO/PILOT_MAILTO) su home FAQ, /prezzo PM, /per-property-manager
- **Problema:** Tutti i contatti commerciali passano da mailto precompilati: su mobile o senza client mail il mailto fallisce silenziosamente; nessun lead tracciato/recuperabile, nessuna qualificazione. Per il segmento PM (deal più grosso) è il canale peggiore.
- **Fix:** Sostituire i mailto PM/pilota con un form leggero (serverless via /api/subscribe già presente, o Formspree/Tally) che cattura il lead e notifica. Mantenere il mailto solo come fallback.

### [MAJOR] Terracotta su avorio esattamente al limite 4.5:1 — testo piccolo terracotta fallisce in pratica

- **Dove:** globals.css token terracotta #bc4b2b su avorio/carta; eyebrow text-xs e tagline text-sm in app/page.tsx:87,147,188,220,531,645
- **Problema:** Misurato: terracotta/avorio 4.50:1, terracotta/carta 4.77:1 — passa di un soffio per testo normale ma fragilissimo; con la grana di carta (body::before opacity .04) e l'antialiasing scende sotto soglia. Eyebrow uppercase e tagline hero sono testo piccolo ad alto rischio (WCAG 1.4.3).
- **Fix:** Usare terracotta-dark #9e3d22 (~6:1) per testo terracotta < 18.66px bold / 24px regular (eyebrow, tagline, link inline). Non usare mai terracotta puro per testo sotto i 16px; tenere il terracotta chiaro per superfici/decorazione.

### [MAJOR] Testo a bassa opacità sulla pricing card terracotta sotto soglia di contrasto

- **Dove:** app/page.tsx Card pricing righe 488 (opacity-90), 497/499/510 (opacity-80/70 trial note)
- **Problema:** Su sfondo terracotta il testo primary-foreground con opacity-80 misura 3.62:1, opacity-70 (trial note) 3.12:1, opacity-90 4.16:1 — tutti sotto 4.5:1 (WCAG 1.4.3). Sono informazioni di prezzo, non decorative.
- **Fix:** Rimuovere le opacity sul testo della card terracotta (usare primary-foreground pieno per prezzo, unit, trial note) o aumentare la luminosità del foreground/scurire leggermente il bg della card.

### [MAJOR] Focus ring globale terracotta invisibile su sfondo terracotta (CTA pricing card)

- **Dove:** app/globals.css:216-220 (:focus-visible outline 2px terracotta) e --color-ring terracotta:71
- **Problema:** L'outline di focus terracotta dà ~4.5:1 su avorio (passa di poco per 1.4.11) ma su sfondo terracotta (focus su CTA bianche dentro la pricing card) è praticamente invisibile (~1:1). I bottoni CTA dentro la card avranno focus ring terracotta su terracotta.
- **Fix:** Per elementi su sfondo scuro/terracotta usare un focus ring chiaro (avorio/inchiostro) con offset; sulle CTA della card pricing (righe 500-506) ring avorio invece del globale terracotta. Considerare outline a doppio colore (inchiostro+avorio).

### [MAJOR] Menu mobile senza focus trap né chiusura con Escape

- **Dove:** components/marketing/MarketingHeader.tsx:60-100
- **Problema:** Il pannello nav mobile: non chiude con Escape; il focus non viene spostato dentro né intrappolato (tabbando si esce dietro il menu); alla chiusura non torna al bottone hamburger; manca aria-controls. Viola WCAG 2.1.2 e 2.4.3.
- **Fix:** Aggiungere onKeyDown Escape che chiude e rimette focus sul toggle; id sul pannello + aria-controls sul button; spostare il focus sul primo link all'apertura; focus-trap o componente Dialog/Disclosure accessibile.

### [MAJOR] Bundle JS iniziale enorme per un sito di marketing (~1MB non compresso)

- **Dove:** chunk /\_next/static (226KB+150KB+122KB+121KB+113KB) + package.json (gsap, lenis, framer-motion, split-type)
- **Problema:** La home carica 15 chunk JS per ~1MB su una landing prevalentemente statica con 2 immagini. gsap+ScrollTrigger, lenis, framer-motion E split-type sono tutti nel critical path: gonfiano TBT/INP e ritardano l'interattività su mobile mid-range. È il singolo fattore che più danneggia il punteggio Performance.
- **Fix:** Scegliere UNA libreria di animazione (gsap+lenis OPPURE framer-motion, oggi convivono). Caricare gli effetti scroll via next/dynamic ssr:false dietro IntersectionObserver, fuori dal bundle above-the-fold. Valutare rimozione di split-type.

### [MAJOR] Article schema senza 'image' né BreadcrumbList sulle pagine guida

- **Dove:** /guide/tassa-soggiorno-roma-2026 (JSON-LD: Article senza image, 0 BreadcrumbList)
- **Problema:** Google richiede 'image' nell'Article per i rich result; senza, l'articolo non ottiene la card immagine in SERP. Manca anche BreadcrumbList su /guide/\*, perdendo breadcrumb e segnale di gerarchia. Le guide sono il motore SEO organico: il gap pesa di più qui.
- **Fix:** Aggiungere 'image':['https://norma.casa/guide/<slug>/opengraph-image'] all'Article (OG dinamico esiste già) e un componente JSON-LD BreadcrumbList (Home › Guide › Titolo) su ogni /guide/\* e /per-property-manager.

### [MAJOR] Mancano apple-touch-icon, web manifest e theme-color

- **Dove:** app/layout.tsx (solo icon.svg + favicon.ico); confermato live (0 apple-touch-icon/manifest in head)
- **Problema:** Nessun apple-touch-icon (salvando su home iOS si ottiene uno screenshot sgranato), nessun manifest.webmanifest e nessun theme-color terracotta: la barra del browser mobile resta grigia di sistema invece che brandizzata.
- **Fix:** Aggiungere app/apple-icon.png (180x180), creare app/manifest.ts (name/short_name 'Norma', theme_color '#bc4b2b', background_color '#f7f2e8', icons) e themeColor '#bc4b2b' nel viewport export di layout.tsx.

### [MAJOR] OG image usa il font di sistema invece di Fraunces e copy OG sconfina in 'fa al posto tuo'

- **Dove:** app/opengraph-image.tsx + app/layout.tsx/JsonLd.tsx (og:description 'fa la burocrazia al posto tuo')
- **Problema:** L'OG card — primo contatto su WhatsApp/Telegram/LinkedIn (canali GTM) — mostra il titolo in un grottesco generico invece che in Fraunces, rompendo la coerenza nel punto più virale. In più og:description e Organization.description dicono 'fa la burocrazia AL POSTO TUO', ambiguo verso 'invia da sola' e in contraddizione con la meta description che invece dice 'tu confermi con un click'.
- **Fix:** Caricare Fraunces-roman.woff2 in ImageResponse e applicarlo al titolo OG. Allineare og:description e Organization.description a 'Norma prepara... tu confermi con un click'; cambiare il sottotitolo OG da 'fatta al posto tuo' a 'preparata, tu confermi'.

### [MAJOR] Banner cookie copre la CTA hero al primo load e ignora la safe-area iPhone

- **Dove:** components/CookieBanner.tsx (fixed inset-x-0 bottom-0, px-4 pb-4; nessun env(safe-area-inset))
- **Problema:** A 390px il banner 'Usiamo solo cookie tecnici... Ho capito' copre/affianca il bottone 'Prova Norma gratis' e la riga di trust above-the-fold, e si sovrappone al mockup hero con layout shift percepito. Il pb-4 fisso mette 'Ho capito' troppo vicino all'home indicator iPhone (nessun env(safe-area-inset-bottom) in tutto il CSS).
- **Fix:** Banner più compatto (una riga) o slim bar in alto, non sovrapposto al contenuto chiave; aggiungere viewport-fit=cover e padding-bottom: max(1rem, env(safe-area-inset-bottom)). Testare che il primo tap utile non cada sotto il banner.

### [MAJOR] Link footer alti ~25px: target touch sotto 44px

- **Dove:** Footer live (contentinfo) — h≈25px per tutti i link colonna; 'Vedi tutte le domande' h=20px
- **Problema:** Tutti i link del footer su mobile hanno altezza ~25px, ben sotto i 44px (WCAG 2.5.5/Apple HIG); fitti e verticali, facile sbagliare tap tra 'News' e 'Team' adiacenti.
- **Fix:** Aumentare il padding verticale dei link footer su mobile (py-2.5/min-h-11 → ≥44px) o il gap tra le voci. Vale anche per i link inline tipo 'Vedi tutte le domande'.

### [MINOR] Lo screenshot di prodotto hero (AppShot) ha font fissi 10–12.5px illeggibili su mobile

- **Dove:** components/marketing/product/AppShot.tsx (text-[10px]..text-[12.5px]); evidente a 390px
- **Problema:** L'AppShot è il fulcro visivo dell'hero ma usa font in pixel FISSI non responsive (header tabella 10px, riga ospite 12.5px, badge 'Acquisita'/'In invio' 10.5px). A 390px restano 10-12.5px sotto la soglia di leggibilità con contrasto muted basso: sembra uno 'screenshot infilato' più che un visual curato.
- **Fix:** Su mobile scalare i font del mock (≥13-14px per nome ospite e badge), o ridurre la card con transform:scale() mantenendo leggibilità, o versione semplificata (meno colonne, font più grandi). Evitare px fissi.

### [MAJOR] AppShot decorativo con dati finti esposto agli screen reader come contenuto reale

- **Dove:** components/marketing/product/AppShot.tsx:49-51 (root <div> senza aria-hidden), in app/page.tsx:120 dentro <main>
- **Problema:** AppShot è un mockup con dati ospite finti ('Mario Rossi', 'Léa Dubois', righe Schedine, pill di stato); il root <div> non ha aria-hidden, quindi uno screen reader legge la tabella finta come contenuto reale dell'hero. Stesso rischio per SchedinaShot/CheckinShot (aria-hidden solo su sotto-elementi).
- **Fix:** Aggiungere aria-hidden='true' sul <div> root di AppShot (è decorativo) e verificare che SchedinaShot/CheckinShot abbiano aria-hidden sul contenitore radice.

### [MINOR] Contraddizione interna in home: 'Un unico piano' poi due/tre prezzi nella stessa pagina

- **Dove:** app/page.tsx:469-475 (H2 'Un unico piano') vs :546-605 ('Per chi è Norma' con €90 host e €72 PM)
- **Problema:** La sezione prezzo dichiara 'Un unico piano, tutto incluso' con una card €90, ma ~1 schermata sotto compaiono DUE prezzi (€90/€72) e il link parla di Host/Host+/Property manager: il messaggio 'unico piano' è smentito dalla pagina stessa.
- **Fix:** Rendere coerente: 'un prezzo per struttura, che scala' (tier una sola volta) o togliere il claim 'unico piano'. Evitare di ripetere i prezzi in due sezioni con framing diversi.

### [MINOR] Sei etichette CTA diverse per due sole azioni (incoerenza brand voice)

- **Dove:** home — 'Prova Norma gratis', 'Prova gratis', 'Inizia ora', 'Inizia la prova gratuita', 'Guarda la demo', 'Contatta il team'
- **Problema:** Lo stesso destination LOGIN_URL ha 4-5 label primarie diverse nella stessa pagina. Una product page premium usa UN verbo coerente; la variabilità sembra trascuratezza, riduce memorabilità e impedisce un A/B test pulito.
- **Fix:** Standardizzare la CTA primaria su un'unica formula (es. 'Inizia gratis') ovunque punti a LOGIN_URL, centralizzata in lib/site.ts; tenere distinta solo la secondaria ('Contatta il team'/'Parliamone').

### [MINOR] Due sistemi di bottone paralleli (CTAButton terracotta vs buttonVariants shadcn)

- **Dove:** components/CTAButton.tsx + ui/button.tsx vs marketing/primitives.tsx (buttonVariants), misti in Navbar/Hero/page.tsx
- **Problema:** Coesistono due librerie di bottoni con raggi/ombre diversi (il commento in primitives.tsx ammette retaggio 'tema indaco'): micro-differenze di altezza, padding e ombra tra bottoni che dovrebbero essere identici.
- **Fix:** Consolidare su UN solo componente bottone con varianti (primary/secondary/outline), eliminare il duplicato, aggiornare gli import e rimuovere il commento/legacy 'indaco'.

### [MINOR] Raggi-bordo non standardizzati: token --radius-card ignorato

- **Dove:** globals.css:73 (--radius-card:14px) vs page.tsx (rounded-xl 12px, rounded-3xl 24px) e prezzo (rounded-2xl 16px, rounded-[28px])
- **Problema:** Almeno 4 raggi diversi (12/16/24/28px) su superfici dello stesso brand e nessuno usa il token (14px). Card home (xl) e /prezzo (2xl) hanno arrotondamenti diversi pur essendo lo stesso elemento: tell evidente di 'assemblato a pezzi'.
- **Fix:** Definire una scala raggi (es. card=16px, banner=24px) applicata via token/util; far usare a tutte le Card lo stesso valore. Aggiornare --radius-card o sostituirlo coerentemente.

### [MINOR] Ritratti founder con sfondi e temperatura colore incoerenti

- **Dove:** sezione 'Le persone dietro Norma'; app/page.tsx:402-455 (/team/gianluca.png, /team/riccardo.jpg)
- **Problema:** Le due foto affiancate hanno backdrop diversi (sinistra crema/pesca caldo, destra grigio-verde freddo) e resa pelle diversa (destra 'levigata' tipo render): sembrano due set/sorgenti diversi, rompendo la coesione editoriale calda proprio dove costruisci fiducia.
- **Fix:** Uniformare i due ritratti: stesso fondo (avorio/carta), stessa temperatura colore, stesso crop/scala; idealmente un trattamento duotone caldo coerente.

### [MINOR] Naming tier incoerente tra prod e repo (Pro/Agenzie vs Property manager/Host+)

- **Dove:** LIVE /prezzo e /per-property-manager 'Pro'/'Agenzie' vs lib/pricing.ts 'Host+'/'Property manager'; FAQ cita un 'piano Pro' inesistente
- **Problema:** Il nome del piano cambia a seconda della pagina; la FAQ home cita 'il piano Pro' che non esiste nel listino. Anche a deploy allineato serve un naming unico, altrimenti l'utente vede piani con nomi diversi.
- **Fix:** Fissare i nomi ufficiali dei piani (1 tassonomia) usati identici in home, /prezzo, /per-property-manager e FAQ; sostituire 'piano Pro' con il nome reale e linkare alla pagina giusta.

### [MINOR] Terminologia turismo incoerente: 'movimento turistico ISTAT' / 'Ross1000' / 'movimento turistico'

- **Dove:** home varie sezioni + mock dashboard ('Movimento ISTAT' e 'Ross1000' come voci separate)
- **Problema:** Il sito alterna i termini e nel mock affianca 'Movimento ISTAT' e 'Ross1000' come se fossero due cose: Ross1000 è il portale del movimento turistico, ISTAT è l'ente. Per un host nuovo sembrano tre adempimenti distinti, minando l'autorevolezza sul pilastro Turismo.
- **Fix:** Standardizzare 'movimento turistico (ISTAT/Ross1000 e portali regionali)' ovunque; nel mock non affiancare 'Movimento ISTAT' e 'Ross1000' come voci separate. Raggruppare per pilastro: 'Polizia di Stato (Alloggiati Web) · ISTAT/Ross1000'.

### [MINOR] Claim 'parla direttamente con i portali / al posto tuo' tecnicamente falso per il turismo

- **Dove:** home — dashboard mock + Advantages 'il motore che parla con gli enti al posto tuo'
- **Problema:** 'Parla direttamente con i portali' suggerisce automazione end-to-end senza intervento, in tensione con 'tu confermi'; per il movimento turistico/ISTAT il prodotto produce un FILE da caricare a mano sul portale, quindi il claim è falso per quel pilastro.
- **Fix:** Distinguere i canali: Alloggiati 'si collega al web service e invia dopo la tua conferma'; turismo 'prepara il file pronto da caricare'. Evitare 'parla con gli enti al posto tuo' come claim onnicomprensivo.

### [MINOR] Nav incoerente: header reale ≠ lib/site.ts (Team/Guide/News non raggiungibili)

- **Dove:** components/marketing/MarketingHeader.tsx:13-19 vs lib/site.ts NAV_LINKS:21-30; manca aria-current
- **Problema:** L'header live espone solo Funzionalità/Come funziona/Property manager/Prezzo/FAQ, mentre NAV_LINKS definisce anche Guide/News/Team/Supporto non usati: codice morto e pagine reali (/team asset di fiducia, /guide SEO) non raggiungibili dalla nav. Inoltre nessuna voce nav espone aria-current='page'.
- **Fix:** Riconciliare l'header con lib/site.ts come sorgente unica (o rimuovere il NAV_LINKS inutilizzato); esporre almeno 'Team'; aggiungere aria-current='page' via usePathname() con stile visivo.

### [MINOR] Doppio CTA su /per-property-manager crea paralisi decisionale

- **Dove:** norma.casa/per-property-manager — 'Richiedi un pilota' (mailto) + 'Prova gratis' (app)
- **Problema:** La landing PM mette sullo stesso piano vendita assistita e self-serve senza guidare quale scegliere: per un gestore di 5-50 strutture i due percorsi hanno implicazioni opposte, l'ambiguità riduce l'azione.
- **Fix:** Gerarchizzare: primario 'Richiedi un pilota' (alto valore), secondario/ghost 'Prova gratis' con riga 'Preferisci provare da solo? Inizia gratis'.

### [MINOR] Equivalenze mensili confondono il prezzo (tre cifre per piano)

- **Dove:** home (data.tsx:131 '≈ €7,50/mese, oppure €9/mese') e /prezzo (lib/pricing.ts monthlyNote)
- **Problema:** Ogni prezzo porta annuale + due numeri mensili (≈€7,50/mese e €9/mese): tre cifre per lo stesso piano nel primo sguardo. '€9/mese' può sembrare il prezzo reale e far percepire €90/anno come poco conveniente.
- **Fix:** Mostrare un solo prezzo dominante (annuale grande + '≈€7,50/mese' piccolo), relegare il €9/mese flessibile a riga/toggle secondario ed esplicitare il risparmio ('risparmi 2 mesi con l'annuale').

### [MINOR] Mancano segnali di sicurezza/compliance nel primo viewport

- **Dove:** home — trust GDPR/UE solo in fondo (app/page.tsx:236) e su /login, non nell'hero
- **Problema:** Norma chiede credenziali Questura e dati documento ospiti: la sicurezza è obiezione primaria, ma 'dati cifrati · GDPR · server UE' appare solo in profondità. Nel primo schermo nessun badge disinnesca la diffidenza prima dello scroll.
- **Fix:** Portare una riga di trust ('Credenziali cifrate · Dati in UE · Conforme GDPR') subito sotto l'hero o nella striscia delle fonti ufficiali.

### [MINOR] Icone informative salvia e grana carta erodono i contrasti borderline

- **Dove:** app/page.tsx (Check/ShieldCheck/Sparkles text-salvia #6b7a5e) + globals.css:135-144 (body::before feTurbulence opacity 0.04)
- **Problema:** salvia su avorio 4.12:1: ok come testo, ma le icone semanticamente portanti (spunta=incluso) e l'overlay di grana fixed a opacity .04 su tutta la pagina spingono i valori borderline sotto soglia in rendering reale (terracotta 4.50, salvia 4.12). Molte icone lucide decorative non hanno aria-hidden.
- **Fix:** Usare salvia più scuro per icone informative o affiancare sempre testo; ridurre l'opacity della grana a ~0.025; alzare i colori borderline; aggiungere aria-hidden a tutte le icone decorative.

### [POLISH] Hero variants morti in repo (HeroA/B/C, Hero.tsx) divergenti dal live

- **Dove:** components/sections/Hero.tsx ('In regola, senza pensarci.') e hero-variants/HeroA|B|C.tsx — non usati
- **Problema:** Più hero alternativi con copy diverso non collegati alla pagina: codice morto che confonde chi cerca la sorgente del titolo e rischia di essere preso per la verità.
- **Fix:** Rimuovere (o spostare in /hero-lab esplicitamente) i componenti hero non usati; lasciare solo la hero effettivamente renderizzata.

### [POLISH] Bandiera 🇮🇹 emoji nel footer: resa incoerente tra OS e fuori tono col brand

- **Dove:** footer '...Fatto in Italia 🇮🇹'
- **Problema:** L'emoji bandiera si rende diversamente per piattaforma (su Windows spesso 'IT' testuale), è l'unico emoji del sito e stona col registro sobrio 'Carta & Inchiostro'; gli screen reader la leggono in modo ridondante col testo 'Fatto in Italia'.
- **Fix:** Sostituire con un piccolo SVG tricolore inline o rimuovere lasciando 'Fatto in Italia'; se mantenuta, avvolgere in <span aria-hidden='true'>.

### [POLISH] Pannelli FAQ usano role=region: landmark eccessivi nella mappa screen reader

- **Dove:** components/FaqAccordion.tsx:119-126 (div role='region' per ogni pannello)
- **Problema:** Con 6 FAQ in home si creano 6 landmark 'region' aggiuntivi: il pattern WAI-ARIA Accordion lo sconsiglia con molti item. Rumore di navigazione per screen reader.
- **Fix:** Per accordion con >5 item rimuovere role='region' dai pannelli (mantenendo aria-labelledby/id per aria-controls), tenendo aria-controls/aria-expanded sul button.

### [POLISH] ScrollProgress animata via spring anche con prefers-reduced-motion

- **Dove:** components/ScrollProgress.tsx (useSpring senza check reduced-motion)
- **Problema:** ScrollProgress usa useSpring senza useReducedMotion: la barra si muove con molla anche in reduced-motion (la regola CSS azzera animation/transition ma non i motion-value JS di framer). Incoerente con la cura di Aurora/Parallax/Reveal.
- **Fix:** Importare useReducedMotion: se reduce, usare scrollYProgress diretto senza spring (o nascondere la barra), allineando la gestione a Aurora/Parallax (WCAG 2.3.3).

## APP — 73 difetti

### [BLOCKER] Navigazione globale assente: nessuna sidebar e SiteHeader/CommandPalette/MobileNav NON montati

- **Dove:** src/app/layout.tsx (root rende solo {children}); SiteHeader usato solo da page-skeleton.tsx (loading)
- **Problema:** L'unico layout è il root e non monta nulla. SiteHeader (che include CommandPalette + MobileNav) è renderizzato SOLO dentro page-skeleton.tsx, usato solo nei loading.tsx: quindi command palette, bottom-bar mobile e header persistente compaiono solo nel flash di caricamento e poi spariscono. Le pagine reali (ConciergeScene/ConciergePage) non montano alcuna nav: tra sezioni si naviga solo col link '← Dashboard', su mobile l'host resta intrappolato senza menu. Difetto più grave, segnalato come BLOCKER da 4 critici.
- **Fix:** Creare un layout autenticato condiviso (es. src/app/(app)/layout.tsx) che renda SiteHeader → CommandPalette + MobileNav su TUTTE le rotte protette, e/o una sidebar/nav-rail persistente desktop con NAV_SECTIONS e aria-current. Smoke test: ⌘K e bottom-bar presenti in /stays, /schedine, /tourist-tax, ecc.

### [BLOCKER] Pagine interne perdono ⌘K e ogni navigazione: solo '← Dashboard' (vicolo cieco)

- **Dove:** src/components/concierge/concierge-page.tsx:79-90 (usata da schedine, stays, properties, agency, tourist-tax, istat, billing, credentials)
- **Problema:** ConciergePage ha un header proprio con solo brand + '← Dashboard'; non monta CommandPalette/CommandTrigger/MobileNav. Da /schedine non puoi andare a /tourist-tax senza tornare in dashboard; su desktop manca anche il bottone ⌘K (la palette si apre solo via scorciatoia montata in SiteHeader, qui assente). La 'scorciatoia globale ⌘K' di fatto non funziona sulle pagine interne né sulla dashboard.
- **Fix:** Far montare a ConciergePage la stessa shell di navigazione (sidebar/nav + CommandPalette + MobileNav) o unificare tutte le pagine sotto un AppShell unico; verificare che ⌘K funzioni anche sulle pagine interne.

### [BLOCKER] La frase letteralmente vietata 'Norma può inviare da sola le schedine'

- **Dove:** src/app/schedine/page.tsx:194-200 (card 'Auto-invio programmato')
- **Problema:** Il testo recita 'Quando attivo per una credenziale, Norma può inviare da sola le schedine già validate dal Test': è esattamente la formula proibita ('mai invia da sola'), su un prodotto di compliance, accanto a un interruttore oggi SPENTO di default. Mina la fiducia e contraddice il posizionamento.
- **Fix:** Riscrivere senza antropomorfizzare l'invio autonomo: 'Con l'auto-invio attivo per una credenziale, le schedine già validate dal Test vengono inviate automaticamente all'orario programmato; quelle bocciate restano da rivedere e non partono mai. Richiede anche l'abilitazione lato server.' Rimuovere 'Norma può inviare da sola'.

### [BLOCKER] Dashboard hero: 'Decidi tu, eseguo io' e 'Tengo in regola l'ISTAT/le schedine'

- **Dove:** src/app/dashboard/\_lib/scene.ts:55 ('Tengo in regola...'), :93 ('Decidi tu, eseguo io')
- **Problema:** L'hero fa dire a Norma in prima persona che TIENE IN REGOLA da sola schedine/tassa/ISTAT/check-in e che 'esegue io'. ISTAT e Alloggiati sono gated a decisione umana esplicita (guardrail #1): affermare che Norma li tiene in regola da sé è falso e fuori tono.
- **Fix:** Sostituire possesso/esecuzione con preparazione+conferma: titolo 'Preparo le tue pratiche; le confermi tu.', rotante 'schedine/tassa/ISTAT/check-in' preceduto da 'Tengo pronte', sub 'Norma prepara, tu confermi con un click'. Eliminare 'eseguo io'.

### [BLOCKER] Errore di login/signup non collegato ai campi (manca aria-describedby)

- **Dove:** src/app/login/LoginForm.tsx:27-62 e signup/SignupForm.tsx:28
- **Problema:** L'errore d'autenticazione è solo un FormMessage a livello-form; gli Input ricevono aria-invalid (login) ma nessun aria-describedby verso il messaggio (in signup l'input password non riceve nemmeno aria-invalid). Lo screen reader sente 'non valido' senza la ragione. Regressione rispetto a CheckinForm (che lo fa bene). Viola WCAG 3.3.1/3.3.3.
- **Fix:** Usare il pattern Field con error per campo o dare id stabile al FormMessage (es. 'login-form-error') e aggiungere aria-describedby agli Input quando c'è errore. Idealmente il server action restituisce errori per-campo passati a <Field error=...>.

### [MAJOR] Dark mode vietato dal brand ma ancora vivo nel codice (globals.css + ~8 file)

- **Dove:** src/app/globals.css:3-4,68-103,145-148 (.dark{}, color-scheme:light dark) + dark:\* in istat/billing/stays/checkin/onboarding/auth-shell/schedine
- **Problema:** CLAUDE.md (#97) e layout.tsx dichiarano 'nessun dark mode', ma globals.css spedisce un blocco .dark completo, html ha color-scheme:light dark e ~8 componenti usano utility dark:\*. È codice morto, viola la regola di brand e — peggio — color-scheme:dark fa rendere i controlli nativi (input date, select, autofill, scrollbar) in dark su OS in dark mode, producendo testo chiaro in campi assunti chiari (contrasto rotto, rischio a11y reale).
- **Fix:** Rimuovere il blocco .dark e le utility dark:\*; impostare html{color-scheme:light} (o meta color-scheme light only); aggiungere stile coerente per input:-webkit-autofill; eliminare i commenti su dark mode.

### [MAJOR] Due sistemi di badge paralleli e divergenti per gli stessi stati

- **Dove:** src/components/ui/badge.tsx (variant success/warning) vs cmx-badge in concierge-page.css; /istat usa <Badge>, schedine/tourist-tax/billing usano cmx-badge
- **Problema:** Lo stato 'Pronta'/'READY' è pill VERDE pieno (<Badge variant=success>) su /istat ma pill NEUTRA (cmx-badge-wait) su /schedine e /tourist-tax: stessa semantica, due look, palette non coincidenti. L'utente non può imparare un linguaggio cromatico unico degli stati.
- **Fix:** Scegliere UN solo sistema di badge (preferibilmente <Badge> con variant brandizzati) e rifattorizzare tutte le pagine + schedina-status-display.ts; eliminare cmx-badge-\* o renderle alias dei variant.

### [MAJOR] /istat mescola design-system shadcn e mondo cmx nella stessa pagina

- **Dove:** src/app/istat/page.tsx
- **Problema:** La pagina usa contemporaneamente <Badge>/<Input>/<Button>/<Card> shadcn E i contenitori cmx-section/cmx-empty; è l'unica lista con <Badge> mentre le altre usano cmx-badge, e una <table> shadcn dentro Card mentre stays/schedine usano cmx-row: due pattern di lista nello stesso prodotto.
- **Fix:** Uniformare /istat al linguaggio delle altre liste (cmx-row o il sistema unico scelto), riportare i badge al sistema unico, e decidere un solo pattern 'lista densa'.

### [MAJOR] Doppio brand mark incoerente: SealMark vs regole .cmx-brand svg

- **Dove:** concierge-scene.tsx + concierge/concierge-page.tsx (<SealMark/>) vs .cmx-brand svg in concierge.css:84-88
- **Problema:** L'header brand è reso diversamente: le scene usano <SealMark/> ma il CSS .cmx-brand definisce regole per un <svg> figlio (height 30px, terracotta) che si applicano in modo incerto al componente. La dimensione del marchio dipende da CSS pensato per un SVG inline: rischio di marchio di dimensione/colore diverso tra dashboard e pagine interne.
- **Fix:** Standardizzare un unico componente Brand/SealMark con dimensioni via prop, rimuovere le regole .cmx-brand svg che presumono altro markup, verificare resa identica.

### [MAJOR] Overlay grana a tutto schermo z-index 50 mix-blend-multiply sopra il contenuto

- **Dove:** src/app/dashboard/concierge.css:30-37 (.cmx-grain fixed, z-index:50, opacity:0.5, mix-blend-multiply)
- **Problema:** La grana è fixed a tutta viewport, z-index 50 (sopra contenuto a z-2 e sopra la bottom-nav z-40), opacity 0.5 multiply: anche con pointer-events:none moltiplica su tutto il testo/KPI/nav, rischiando di abbassare il contrasto del muted #5b5347 sotto AA e dare un velo 'sporco' costante; su display non-retina è aggressiva.
- **Fix:** Abbassare l'opacità (~0.10-0.18 come nell'AuthShell), confinare la grana dietro il contenuto (z-index negativo) e non coprire la bottom-bar; verificare il contrasto del muted con grana attiva.

### [MAJOR] Sovrapposizione confusa tra 'Strutture' (/agency) e 'Immobili' (/properties)

- **Dove:** src/app/agency/page.tsx:71-87 e properties/page.tsx:39-51
- **Problema:** Due sezioni distinte mostrano entrambe l'elenco proprietà, linkano a /properties/[id], hanno empty-state quasi identici ('Nessuna struttura' vs 'Nessun immobile') e si rimandano a vicenda. Per un host con 1-3 immobili sembrano la stessa cosa: sovraccarico cognitivo e dubbio su 'dove aggiungo un immobile?'.
- **Fix:** Unificare in una sola sezione 'Immobili' con una vista/tab 'Panoramica compliance', oppure rendere /agency una tab della dashboard. Eliminare la duplicazione dell'elenco proprietà.

### [MAJOR] Logout e gestione account solo dalla dashboard: nessuna rotta /account

- **Dove:** src/app/dashboard/page.tsx:49-71 (unico signOut) + assenza di src/app/account
- **Problema:** 'Esci' compare solo nella dashboard (e in onboarding): da schedine/stays/properties/tourist-tax/istat/credentials/billing non c'è modo di disconnettersi senza tornare in dashboard. Non esiste /account: nome, email, password, organizzazione non hanno una home; manca un menu utente nell'header.
- **Fix:** Aggiungere un menu utente persistente nell'header della shell (avatar/nome → Account, Organizzazione, Esci) su ogni pagina; creare /account per profilo, password e organizzazione.

### [MAJOR] Tre superfici di navigazione divergenti: sezioni diverse in nav, quicknav e mobile

- **Dove:** src/lib/nav.ts:22-49 vs dashboard concierge-scene.tsx:107-132 vs mobile-nav MOBILE_SECTIONS
- **Problema:** La quicknav dashboard elenca Strutture(/agency)/Schedine/Soggiorni/Immobili/Tassa/ISTAT/Credenziali senza Dashboard né Abbonamento; NAV_SECTIONS elenca Dashboard..Abbonamento ma non /agency; la bottom-bar mobile mostra solo 4 voci. Tre tassonomie incoerenti: l'utente impara un menu diverso a seconda di dove guarda; /agency raggiungibile solo dalla quicknav.
- **Fix:** Una sola sorgente di verità (NAV_SECTIONS). Decidere se /agency è di primo livello e allineare; generare quicknav e palette dallo stesso array, includere Abbonamento, ordine coerente.

### [MAJOR] ISTAT: tre meccanismi di export/invio sovrapposti nella stessa pagina

- **Dove:** src/app/istat/page.tsx:102-109, 167-230, 232-273
- **Problema:** La pagina espone in sequenza: 'Esporta CSV'+'Invia' in alto, 'Prontezza per struttura' con auto-submit sempre disabilitato (canale stub), e 'Ross1000 XML per struttura' con download. Tre affordance di output diverse, alcune disabilitate, con spiegazioni lunghe: l'host non capisce QUALE azione lo porta a dichiarare.
- **Fix:** Consolidare in un unico flusso per-struttura: stato (Pronta/Mancano dati) + UNA azione primaria contestuale (scarica XML se disponibile, altrimenti 'inserisci a mano con questi numeri'); CSV per-org come azione secondaria; nascondere/spiegare i bottoni sempre disabilitati.

### [MAJOR] Pattern incoerente 'lista sopra / form sotto' costringe a scroll per creare

- **Dove:** properties/page.tsx:52-132, stays/page.tsx:95-209, credentials/page.tsx:53-102 vs tourist-tax (form in cima)
- **Problema:** In properties/stays/credentials l'elenco viene prima e il form 'Aggiungi...' è in fondo: con molti item l'azione primaria è sotto la piega. In tourist-tax il form è in cima: pattern opposto tra pagine sorelle. Incoerenza e attrito per 'aggiungi'.
- **Fix:** Standardizzare: azione di creazione come pulsante primario in testata (apre form in dialog/inline in alto) coerente in tutte le liste, oppure form sempre in cima.

### [MAJOR] Check-in: opzioni 'Tipo di turismo' e 'Mezzo di trasporto' non tradotte

- **Dove:** src/app/checkin/[token]/CheckinForm.tsx:368-390 + istat/ross1000/domains.ts:21-52
- **Problema:** Label e intestazioni del form sono tradotte in 5 lingue, ma le OPZIONI delle tendine turismo/trasporto restano in italiano ('Culturale', 'Congressuale/Affari', 'Aereo+Pullman', 'Caravan/Autocaravan') per ospiti EN/DE/FR/ES: jargon in mezzo a un funnel pubblico tradotto. Anche le liste Paese/Comune mostrano nomi solo in italiano.
- **Fix:** Aggiungere mappe di traduzione per TIPO_TURISMO/MEZZO_TRASPORTO per locale (il valore inviato resta il codice IT); localizzare i nomi Paese (Intl.DisplayNames) o aggiungere alias di ricerca. In subordine, nascondere la sezione ai non-italofoni finché la traduzione non è pronta.

### [MAJOR] Dashboard senza error.tsx né loading.tsx — la home cade nel fallback generico

- **Dove:** src/app/dashboard/ (manca error.tsx e loading.tsx)
- **Problema:** La pagina più visitata fa due fetch (getDashboardData+getOnboardingState) senza error boundary di rotta: un errore DB butta l'utente nel global-error (full reload, fuori contesto), e senza loading.tsx la navigazione mostra schermo bianco fino al server render.
- **Fix:** Aggiungere dashboard/error.tsx (RouteError con message dedicato + reset) e dashboard/loading.tsx (variante 'scene' con KPI placeholder per evitare layout-shift).

### [MAJOR] tourist-tax, properties, billing senza error.tsx né loading.tsx

- **Dove:** src/app/tourist-tax/, properties/, billing/ (entrambi i file mancanti)
- **Problema:** Tre pagine core (Turismo + anagrafica immobili + abbonamento) non hanno boundary di rotta mentre schedine/istat/stays/credentials li hanno: qualunque fallimento query → global-error generico, ogni navigazione lenta → nessuno skeleton. Incoerenza vistosa.
- **Fix:** Aggiungere error.tsx (RouteError con message specifico) e loading.tsx (PageSkeleton) per tourist-tax, properties e billing. Coprire anche auth/forgot, auth/reset, auth/error, agency.

### [MAJOR] Le error boundary di rotta NON riportano a Sentry — crash silenziati in produzione

- **Dove:** src/components/route-error.tsx, auth-route-error.tsx, tutti i src/app/\*/error.tsx
- **Problema:** Solo global-error.tsx chiama Sentry.captureException: tutte le error.tsx di segmento mostrano il messaggio gentile ma non catturano l'eccezione, quindi un errore di rendering (lista schedine, dettaglio soggiorno) è nascosto all'utente E perso per il team. La promessa 'Sentry EU PII-safe (#93)' è bucata sui boundary di rotta.
- **Fix:** In RouteError/AuthRouteError accettare `error` e useEffect(() => { if (error) Sentry.captureException(error) }, [error]); passare sempre `error` dal boundary al componente condiviso.

### [MAJOR] Credenziale scaduta/da-reonboarding non distinta nel blocco invio schedine

- **Dove:** src/app/schedine/CredentialOutboxControls.tsx:103-109 + page.tsx:148
- **Problema:** Il gate è binario (active = status==='ACTIVE'): PENDING_REONBOARDING, INVALID e 'mai verificata' mostrano lo stesso testo 'Credenziale non ATTIVA'. L'edge case 'credenziale scaduta' non ha messaggistica dedicata né link diretto alla credenziale.
- **Fix:** Passare lo status reale e differenziare il copy: INVALID 'password cambiata?: aggiornale', PENDING_REONBOARDING 'da riverificare', con link a /credentials ancorato (#cred-{id}).

### [MAJOR] Transizioni stato dichiarazione tassa senza conferma né feedback di successo

- **Dove:** src/app/tourist-tax/DeclarationActions.tsx:84-102
- **Problema:** 'Segna come pagata/inviata', 'Riapri' cambiano stato con un click, senza conferma e con msg solo in caso di errore: al successo l'utente non vede nulla (manca router.refresh). 'Segna come pagata' è quasi-irreversibile (chiude il ciclo del versamento) senza guard.
- **Fix:** Aggiungere un toast di successo e, per la transizione PAID, un micro-confirm inline ('Confermi il versamento?') coerente col pattern di CredentialOutboxControls.

### [MAJOR] Auto-send toggle senza conferma, azione con effetti reali sull'invio

- **Dove:** src/app/schedine/page.tsx:201-217 (AutoSendToggle)
- **Problema:** L'interruttore 'Auto-invio programmato' abilita l'invio automatico (CLAUDE.md lo marca spento e delicato), ma è un toggle nudo senza micro-confirm al momento dell'attivazione — incoerente col rigore dell'invio manuale (checkbox + conferma).
- **Fix:** Al passaggio OFF→ON mostrare un micro-confirm inline ('Attivo l'invio automatico per {label}? Partiranno solo le schedine validate dal Test') prima di persistere la preferenza.

### [MAJOR] loading.tsx generico (4 righe) per scene/tabelle → layout shift; PageSkeleton non parametrizzato

- **Dove:** src/components/page-skeleton.tsx usato da schedine/stays/istat loading.tsx
- **Problema:** Lo skeleton è 4 righe h-16: fedele per le liste ma fuorviante per dashboard-scene (KPI+diary) e tabelle (istat/tourist-tax), producendo un salto percepito (CLS) quando arriva il contenuto reale.
- **Fix:** Parametrizzare PageSkeleton o creare varianti (skeleton-scene per dashboard con placeholder KPI, skeleton-table per istat/tourist-tax).

### [MAJOR] KPI/proposte: 'tutti in regola'/'posizione regolare' come stato non confermato

- **Dove:** src/app/dashboard/\_lib/scene.ts:136,145,100 + data.ts:358-359
- **Problema:** 'Ospiti registrati · tutti in regola' e 'posizione regolare' si basano solo su overdueCount===0. Un ospite registrato con schedina ancora da CONFERMARE/INVIARE non è 'in regola': l'obbligo non è assolto finché l'host non conferma. Claim di compliance potenzialmente falso.
- **Fix:** Distinguere 'nessuna scadenza superata'/'nessun obbligo scaduto' da 'tutto adempiuto' quando esistono schedine PENDING/UNVERIFIED.

### [MAJOR] Proposte/diario dashboard in prima persona con automazione sovrastimata

- **Dove:** src/app/dashboard/\_lib/data.ts:294,311,325,368-369,232-266; concierge-board.tsx:241-247; scene.ts:63-72
- **Problema:** Tono incoerente: alterna 'prepara, tu confermi' (corretto) con 'al resto penso io', 'preparo in automatico', 'Stanotte ho sistemato N cose' (in larga parte solo sync/lettura, non adempimenti completati). 'Sistemato' suggerisce che l'obbligo è assolto mentre serve la conferma umana; la voce in prima persona di Norma confligge col 'tu' dato all'host altrove.
- **Fix:** Uniformare al pattern 'Norma prepara → tu confermi': 'Stanotte ho preparato/aggiornato N cose'; diario neutro ('Attività di oggi', forma impersonale). Evitare 'al resto penso io' / 'in automatico'.

### [MAJOR] Dialog KpiSheet senza nome accessibile (aria-labelledby mancante)

- **Dove:** src/components/dashboard/concierge-kpis.tsx:120-159 (<dialog> con <h2> non referenziato)
- **Problema:** Il <dialog> apre con showModal() (focus-trap nativo, bene) ma senza aria-label/aria-labelledby verso l'<h2>: lo screen reader annuncia 'dialog' senza nome (WCAG 4.1.2). Al close il focus non torna esplicitamente al KPI di origine.
- **Fix:** Dare id all'h2 (useId) e aria-labelledby al <dialog>; salvare document.activeElement prima di showModal e ripristinarlo al close.

### [MAJOR] Pagine di autenticazione senza <h1> (gerarchia parte da h3)

- **Dove:** src/app/login/LoginForm.tsx:20 (CardTitle) e signup/SignupForm.tsx:23; ui/card.tsx
- **Problema:** Il titolo principale di pagina è il CardTitle 'Bentornato'/'Crea il tuo account'; WebFetch live lo riporta come h3. Se CardTitle è h3 la pagina non ha h1 e salta i livelli (WCAG 1.3.1/2.4.6).
- **Fix:** Rendere CardTitle un elemento configurabile (as) o usare un vero <h1> per il titolo della schermata auth; un solo h1 per pagina, nessun salto di livello.

### [MAJOR] Command palette: nessun focus trap né ritorno focus, gruppi non annunciati

- **Dove:** src/components/command-palette.tsx:49,143-155,184
- **Problema:** Il dialog ⌘K è a mano (role=dialog aria-modal) senza focus-trap reale (Tab esce verso il contenuto), senza ritorno del focus all'elemento che l'ha aperta alla chiusura, e le intestazioni di gruppo 'Vai a'/'Azioni rapide' sono div non associati (manca role=group+aria-labelledby). WCAG 2.4.3/2.1.2.
- **Fix:** Salvare/ripristinare document.activeElement; implementare focus-trap (o primitivo dialog accessibile); dare role=group + aria-labelledby agli ul di gruppo.

### [MAJOR] Input/Select/Combobox a 14px: iOS Safari fa auto-zoom a ogni focus

- **Dove:** src/components/ui/input.tsx:9, select.tsx:9 (text-sm); Combobox usa lo stesso Input
- **Problema:** Tutti i campi usano 14px con h-10: sotto i 16px iOS Safari zooma alla messa a fuoco, scombinando il layout. Sul check-in (16+ campi) e sul login — usati quasi sempre da mobile dall'ospite — è attrito grave.
- **Fix:** Portare i campi a ≥16px su mobile (text-base o text-[16px] md:text-sm). Per il check-in 16px non è negoziabile.

### [MAJOR] Altezza touch dei controlli sotto 44px (h-10=40px, Button sm=32px)

- **Dove:** ui/input.tsx:9, select.tsx:9 (h-10); ui/button.tsx:23 (sm h-8) usato in schedine/page.tsx:291,322
- **Problema:** Input/Select a 40px sono borderline; i Button size='sm' a 32px ('Correggi'/'Apri soggiorno' nelle righe schedine) sono piccoli per il pollice e affiancati con gap-2 (8px), aumentando i mis-tap (Apple 44px, WCAG 2.5.8).
- **Fix:** Alzare i form a h-11 (44px) su mobile; non usare size='sm' per azioni primarie nelle righe; gap ≥12px tra bottoni adiacenti su touch.

### [MAJOR] Griglia KPI a 2 colonne con odometro 42px: overflow a 390px

- **Dove:** src/app/dashboard/concierge.css:935 (.cmx-kpis 2 col sotto 900px), :970 (.cmx-odo 42px), :395 (.cmx-digit 0.62em, height 52px overflow:hidden)
- **Problema:** L'unico breakpoint è 900px e porta i KPI a 2 colonne; manca uno step a 1 colonna per i telefoni stretti. A 390px ogni card è ~165px con odometro 42px: valori a 3-4 cifre o con prefisso/suffisso (valuta) traboccano o vengono tagliati da overflow:hidden.
- **Fix:** Aggiungere breakpoint ≤520px a 1 colonna (o 2 col con odometro ~32px e height coerente); verificare i valori a più cifre.

### [MAJOR] Header concierge (brand + presence pill + Esci) va a capo scomposto a 390px

- **Dove:** concierge.css:69,100,945 (.cmx-top, .cmx-presence) + concierge-scene.tsx:93
- **Problema:** La presence pill ha testo lungo ('Al lavoro per te — ultima verifica HH:MM') senza max-width né troncamento; l'unica regola responsive è flex-wrap a 900px, quindi a 390px la pill scende e spinge 'Esci' a capo, header alto e disordinato. Idem cmx-back/azioni in ConciergePage.
- **Fix:** Su ≤520px nascondere/accorciare il testo della pill (solo icona o 'Al lavoro') con max-width + ellipsis; mantenere brand su una riga e le azioni a destra senza wrap brutto.

### [MAJOR] Righe schedine: colonna destra (badge + scadenza) spinge fuori la riga a 390px

- **Dove:** src/app/schedine/page.tsx:251-274 + concierge-page.css:85 (.cmx-row padding 16px 20px)
- **Problema:** Riga flex justify-between: a sinistra nome+meta truncate, a destra colonna shrink-0 con badge nowrap ('NEEDS_REVIEW'/'In attesa di esito') + data 'entro 23/06 14:30' non rimpicciolibili. A 390px con padding 40px e gap 16px il badge+data può superare ~50% della riga, lasciando al nome pochi px.
- **Fix:** Su mobile impilare il blocco destro sotto il sinistro (o badge a icona+conteggio), togliere white-space:nowrap dove possibile, min-width:0 alla colonna destra e larghezza minima alla sinistra; disabilitare hover di .cmx-row su touch.

### [MAJOR] concierge-page.css senza alcun breakpoint: pagine interne non adattate ai telefoni stretti

- **Dove:** concierge-page.css (nessuna @media) governa schedine/stays/tourist-tax/istat/properties
- **Problema:** Tutto l'adattamento mobile è in concierge.css e solo per la dashboard. concierge-page.css non ha media query: pagesub fisso 18px, pagehead margin 40px, padding sezioni 26-28px su 390px sono sproporzionati e i titoli serif grandi + intro lunghe occupano mezzo schermo prima dei dati.
- **Fix:** Introdurre breakpoint ≤520px in concierge-page.css: ridurre padding sezioni/card, comprimere margin del pagehead, scalare pagesub a ~15-16px; uniformare la strategia responsive tra dashboard e pagine interne.

### [MINOR] Odometro KPI: width cifra fissa 0.62em senza tabular-nums → numeri 'ballerini'

- **Dove:** src/app/dashboard/concierge-kpis.tsx + concierge.css:397 (.cmx-digit width:0.62em)
- **Problema:** Ogni rullo cifra ha width fissa 0.62em su Fraunces 48px: le cifre proporzionali (1, 4, 7) non riempiono 0.62em → spaziatura irregolare. Manca font-variant-numeric: tabular-nums sull'odometro, proprio il caso d'uso dei numeri allineati.
- **Fix:** Aggiungere font-variant-numeric: tabular-nums (tnum) a .cmx-odo/.cmx-digit e calibrare width sull'advance tabulare reale, o usare un font mono per le cifre.

### [MINOR] Densità lista incoerente: cmx-row (stays/schedine) vs Card-per-riga (tourist-tax)

- **Dove:** stays/page.tsx (cmx-row) vs tourist-tax/page.tsx (ogni dichiarazione è una <Card> con header/padding 24px)
- **Problema:** Soggiorni/schedine sono righe compatte; le dichiarazioni tassa sono Card grandi: scorrendo l'app la 'lista' cambia forma e ariosità da sezione a sezione, impressione non sistemica.
- **Fix:** Definire un componente 'ListRow' unico (denso) per stays/schedine/tourist-tax/billing; Card grandi solo per form/blocchi di azione.

### [MINOR] Stato applicato via inline style hardcoded con fallback hex errato

- **Dove:** schedine/page.tsx (rgba(188,75,43,0.45)) e tourist-tax/page.tsx (border 1px solid var(--hairline,#d4cabb))
- **Problema:** Colori/bordi spesso inline con rgba hardcoded o fallback errati: in tourist-tax il fallback dell'hairline è #d4cabb mentre il token reale è #e0d8c8. L'uso massiccio di style inline aggira i token e rende la coerenza fragile.
- **Fix:** Sostituire gli inline con classi/utility che usano i token semantici; correggere il fallback #d4cabb→#e0d8c8 o rimuoverlo (il token esiste sempre).

### [MINOR] Componente Tabs definito ma mai usato (dead code nel design-system)

- **Dove:** src/components/ui/tabs.tsx (nessun import in src/app)
- **Problema:** tabs.tsx (3.7KB) non è importato da nessuna pagina: superficie del design-system inutilizzata, o manca un pattern a tab dove servirebbe (es. filtri di stato su /schedine) o è codice morto.
- **Fix:** O integrarlo dove i filtri di stato lo richiedono (tab PENDING/ACQUIRED/REJECTED su /schedine), o rimuoverlo.

### [MAJOR] Contrasto trend/badge salvia sotto AA (cmx-trend, cmx-badge-ok)

- **Dove:** concierge.css:342-347 (.cmx-trend salvia #6b7a5e su avorio) e concierge-page.css:131-134 (.cmx-badge-ok salvia su salvia-soft #eef0e8)
- **Problema:** Trend KPI salvia su avorio 4.12-4.36:1 a 12px non-bold (sotto 4.5:1); badge-ok salvia su salvia-soft ~4.0:1 a 12px (commento agency.css lo ammette). È lo stato 'positivo' più frequente (Acquisita, tassa pagata, ISTAT pronta) e il trend è testo informativo: WCAG 1.4.3.
- **Fix:** Token --salvia-ink più scuro (~#4f6043/#586b4a, ≥4.5:1) per testo/badge su carta e salvia-soft; o trend a font-weight 700 ≥14px (large text). Verificare a 12px bold.

### [MINOR] Affordance click dei KPI con contrasto 2.26:1 a riposo, attiva solo all'hover

- **Dove:** concierge.css:353-367 (.cmx-kpi-cta opacity:0.55) + concierge-kpis.tsx:172-177
- **Problema:** L'unico segnale che un KPI è cliccabile è 'Riepilogo →' terracotta a opacity 0.55 (~2.26:1) che si accende solo all'hover: su touch/tastiera non c'è hover, l'utente low-vision non distingue i KPI cliccabili dagli inerti. Il CTA è aria-hidden. WCAG 1.4.11.
- **Fix:** Alzare l'opacità a riposo (≥0.8 → ~3:1) o bordo/freccia persistente sui soli KPI con detail; rendere il CTA visibile anche con :focus-visible del button, non solo :hover.

### [MINOR] FormMessage errore con role=alert E aria-live=polite (conflitto)

- **Dove:** src/components/ui/field.tsx:64-66
- **Problema:** Per variant=error il div ha sia role=alert (che implica aria-live=assertive) sia aria-live=polite: contraddittorio, alcuni screen reader annullano l'urgenza. Manca aria-atomic.
- **Fix:** Per gli errori usare role=alert senza aria-live esplicito (o assertive coerente); per il successo role=status + aria-live=polite; aggiungere aria-atomic=true.

### [MINOR] Pulsante close del KpiSheet usa il glyph '✕' come contenuto

- **Dove:** src/components/dashboard/concierge-kpis.tsx:132-139
- **Problema:** Il bottone close ha testo '✕' (salvato da aria-label='Chiudi') ma il glyph resta nell'albero accessibile e alcuni SR/braille lo verbalizzano; non c'è icona SVG aria-hidden coerente col resto (lucide).
- **Fix:** Sostituire con <X aria-hidden/> di lucide-react mantenendo aria-label='Chiudi', o avvolgere il glyph in <span aria-hidden>.

### [MINOR] Input nativi non forzati a color-scheme light → autofill/date picker imprevedibili

- **Dove:** ui/input.tsx:4-23 (nessun color-scheme) + globals.css html color-scheme: light dark
- **Problema:** Con html color-scheme:light dark su OS in dark, il browser può rendere autofill, caret, picker date/time e scrollbar in dark, con testo chiaro in campi assunti chiari (contrasto rotto, autofill giallo/scuro fuori palette).
- **Fix:** Forzare color-scheme:light a :root/html (vedi finding dark mode) e aggiungere stile per input:-webkit-autofill coerente col brand.

### [MINOR] Liste schedine: righe senza struttura semantica/etichette percepibili

- **Dove:** src/app/schedine/page.tsx:238-333 (ul>li>div.cmx-row, scadenza come testo libero)
- **Problema:** Ogni riga impacchetta ospite/struttura/stato/scadenza in testo libero senza relazioni esplicite: in liste dense per uno SR è difficile capire che '12/03 14:30' è la scadenza; manca un legame badge↔riga (WCAG 1.3.1).
- **Fix:** Dare a ogni cmx-row un aria-label di sintesi (nome + stato + scadenza) o un <dl> con etichette visivamente nascoste per scadenza/stato.

### [POLISH] Empty state ISTAT usa <p> grezzo invece del pattern cmx-empty, senza CTA

- **Dove:** src/app/istat/page.tsx:175,240 ('Nessuna struttura configurata.')
- **Problema:** Gli empty delle sezioni struttura sono un <p> mentre il resto usa .cmx-empty (titolo+testo+CTA): incoerenza visiva e nessun invito all'azione ('Aggiungi una struttura').
- **Fix:** Uniformare a .cmx-empty con CTA verso /properties: 'Nessuna struttura configurata — Aggiungine una per preparare il movimento turistico.'

### [POLISH] Badge stato dichiarazione tassa: Pronta/Inviata/Annullata tutti stesso stile 'wait'

- **Dove:** src/app/tourist-tax/page.tsx:17-23 (STATUS_BADGE → cmx-badge-wait)
- **Problema:** DRAFT/READY/SUBMITTED/CANCELLED mappano tutti su cmx-badge-wait (stesso colore), distinti solo dal testo: stati con significati molto diversi visivamente indistinguibili a colpo d'occhio.
- **Fix:** Classi badge differenziate per significato (SUBMITTED neutro, CANCELLED spento/barrato, READY tono d'azione), stesso colore solo a stati equivalenti; aggiungere micro-icone di stato per i daltonici.

### [MINOR] Manca la rotta /account citata nel brief (IA frammentata)

- **Dove:** src/app/ (nessuna cartella account; solo /billing, /credentials, /agency)
- **Problema:** Le impostazioni utente/org sono frammentate tra billing/credentials/agency senza un hub 'Account/Impostazioni': coerenza IA incompleta (collegato al finding logout).
- **Fix:** Decidere se serve un hub /account (profilo, org, logout, lingua) e crearlo, oppure documentare che 'account' è coperto da billing+credentials.

### [MINOR] Empty-state schedine indirizza a /stays senza spiegare la catena di prerequisiti

- **Dove:** src/app/schedine/page.tsx:227-235 + dipendenze stays/properties
- **Problema:** L'empty dice 'Inizia da un soggiorno' (link /stays), ma /stays richiede un immobile e /properties una credenziale: la catena reale Credenziali → Immobili → Soggiorni → Schedine non è comunicata, l'host rimbalza tra empty-state che si rimandano.
- **Fix:** Mostrare il percorso a step (checklist '1. Credenziali 2. Immobile 3. Soggiorno') o linkare al passo realmente necessario in base allo stato dell'org.

### [MINOR] Privacy check-in: 'Nessuna foto del documento viene conservata' senza upload foto

- **Dove:** src/server/modules/checkin/messages.ts:77-78 (it) + en/de/fr/es
- **Problema:** Il form non chiede alcuna foto/upload (solo tipo+numero+luogo): dire 'nessuna foto del documento viene conservata' può confondere ('dovevo caricarla?') più che rassicurare.
- **Fix:** Riformulare in positivo e pertinente: 'I dati servono solo alla comunicazione obbligatoria alla Polizia di Stato e non vengono usati per altro.' Rimuovere il riferimento alla foto.

### [MINOR] 'Ore risparmiate' come KPI vanity con stima opaca presentata come fatto

- **Dove:** scene.ts:170-188 + data.ts:11-12 (MINUTES_SAVED_PER_GUEST=15)
- **Problema:** Il KPI 'ore risparmiate' è un numero animato a odometro accanto a KPI reali (occupazione, tassa), ma è una stima fissa (15 min/ospite) spiegata solo nel drill-down: rischio di percezione gonfiata.
- **Fix:** Etichettare la cifra come stima già nel volto del KPI (suffisso '~' o 'stima') e mantenere la nota; valutare se merita pari dignità visiva dei KPI misurati.

### [MINOR] Agenda: 'una comunicazione tardiva ad Alloggiati è una violazione' — tono che spaventa

- **Dove:** src/app/dashboard/\_lib/data.ts:353
- **Problema:** Frase corretta ma allarmante in una dashboard che vuole rassicurare; 'è una violazione' senza indicare l'azione immediata aumenta l'ansia.
- **Fix:** Orientare all'azione: 'Da gestire subito: oltre le 24h dall'arrivo la comunicazione ad Alloggiati è tardiva. Apri e conferma.' con link diretto dalla riga.

### [MINOR] BuildDeclarationForm: periodo a testo libero con regex, validazione povera

- **Dove:** src/app/tourist-tax/BuildDeclarationForm.tsx:50-57
- **Problema:** Il periodo è un Input testo con pattern regex: su input non valido il browser mostra il messaggio nativo generico ('Match the requested format'), non un errore i18n; l'utente non sa i formati ammessi se non legge il placeholder.
- **Fix:** Aggiungere title sul pattern con messaggio IT ('Usa mese 2026-05, trimestre 2026-Q2 o anno 2026') e idealmente un selettore di cadenza che genera il valore.

### [MINOR] RouteError ignora la prop `error` — prop morto e intento tradito

- **Dove:** src/components/route-error.tsx:12-21; stays/error.tsx:13 e schedine/error.tsx passano `error`
- **Problema:** La firma dichiara `error?:` ma non lo destruttura né lo usa; stays/error.tsx passa error={error} aspettandosi logging: codice fuorviante, l'errore viene scartato.
- **Fix:** O consumare `error` per la cattura Sentry (vedi finding Sentry), o rimuovere `error` da firma e call-site.

### [MINOR] Download CSV/PDF e Esporta ISTAT senza feedback di successo / popup bloccato

- **Dove:** tourist-tax/DeclarationActions.tsx:63-82 e istat/IstatExportButton.tsx + page.tsx:103
- **Problema:** Al successo dei download non viene mostrato nulla (setMsg solo su errore); su versamenti REDIRECT se il popup è bloccato l'utente non riceve avviso e crede sia fallito; ISTAT può scaricare un file vuoto senza avviso.
- **Fix:** Aggiungere conferma di download con aria-live ('Scaricato {filename}'), gestire window.open===null ('Abilita i popup o usa Esporta CSV'), gestire il caso file vuoto a monte.

### [MINOR] IstatSubmitButton 'Aggiorna invio' sovrascrive la data di invio senza conferma

- **Dove:** src/app/istat/IstatSubmitButton.tsx:22-29,43
- **Problema:** Quando esiste già un invio, il bottone diventa 'Aggiorna invio' e sovrascrive submittedAt al click senza conferma: è la correzione di un dato di compliance (data di invio ISTAT).
- **Fix:** Per il caso 'aggiorna' un micro-confirm ('Aggiorno la data di invio da {vecchia} a oggi?') o un campo data esplicito invece dell'auto-now.

### [MINOR] ReopenRejectedButton: ref refreshed=true definitivo blocca refresh successivi

- **Dove:** src/components/reopen-rejected-button.tsx:16-23
- **Problema:** Il ref refreshed è impostato a true per sempre: riaprendo più schedine in sequenza nello stesso componente, il secondo successo non triggererebbe il refresh. Pattern fragile.
- **Fix:** Usare l'identità di `state` (o un timestamp nel risultato) come dipendenza invece di un boolean monodirezionale.

### [MINOR] Onboarding 'Esci' non spiega che è incompleto / non conferma il salvataggio

- **Dove:** src/app/onboarding/OnboardingWizard.tsx:100-107 + proposta onboarding in dashboard
- **Problema:** 'Esci' rimanda a /dashboard senza conferma; in dashboard ricompare 'Configurazione al X%'. L'utente che esce a metà non riceve feedback del perché torna al wizard né che i dati sono salvati per-step.
- **Fix:** Rinominare in 'Salva ed esci' e mostrare un toast 'Progresso salvato — riprendi quando vuoi'.

### [MINOR] Bottom-nav mobile omette Immobili/Credenziali/ISTAT senza overflow visibile

- **Dove:** src/components/mobile-nav.tsx:29-49 + nav.ts:43-49
- **Problema:** La bottom-bar mostra 4 sezioni + FAB; Immobili/Credenziali/ISTAT/Abbonamento/Agency sono raggiungibili solo via FAB→palette: un host mobile potrebbe non trovare mai 'Credenziali' per collegare Alloggiati. Le label sono anche a 10px e troncate.
- **Fix:** Aggiungere una voce 'Altro'/overflow che apra un menu con le sezioni rimanenti; portare le label a ≥11-12px e accorciarle ('Tassa' invece di 'Tassa di soggiorno').

### [MINOR] cmx-quicknav: scroll orizzontale senza affordance e link a /agency non in nav.ts

- **Dove:** concierge.css:949-969 (overflow-x:auto, scrollbar nascosta) + concierge-scene.tsx:110 (Link /agency 'Strutture')
- **Problema:** Su mobile i 7 pill diventano scroll orizzontale senza indicatore/fade: l'host non capisce che può scorrere; il primo pill punta a /agency, rotta non in NAV_SECTIONS e incoerente con 'Immobili'(/properties). È anche l'unica nav visibile su mobile ma solo in dashboard.
- **Fix:** Aggiungere un fade ai bordi o scrollbar sottile su touch; verificare/allineare il link /agency a nav.ts; non affidare la navigazione globale a questa barra presente solo in dashboard.

### [MINOR] cmx-seal-bg 480px causa overflow orizzontale tamponato solo da overflow-x:hidden

- **Dove:** concierge.css:40-50 (.cmx-seal-bg 680px→480px, left:50% translateX(-50%)) + :26 overflow-x:hidden
- **Problema:** Il sigillo è 480px su mobile centrato con translateX(-50%): a 390px sborda oltre il viewport, tamponato solo da overflow-x:hidden su .cmx — fragile (un futuro elemento absolute riporta lo scroll) e spreca rendering (SVG animato 240s + mask) su device deboli.
- **Fix:** Ridurre il sigillo sotto 520px (~320px) o disattivarlo; non dipendere unicamente da overflow-x:hidden per contenere decori più larghi del viewport.

### [MINOR] Card tourist-tax: titolo lungo + badge shrink-0 stringe il titolo su mobile

- **Dove:** src/app/tourist-tax/page.tsx:82-95,106-134
- **Problema:** Header dichiarazione: 'NomeComuneLungo · periodo' accanto a badge shrink-0 comprime il titolo a 390px; nel dl le righe label/valore justify-between con etichette lunghe possono collidere su una riga stretta.
- **Fix:** Permettere il wrap del titolo (min-width:0) o spostare il badge sotto su mobile; consentire il wrap della label del dl o ridurne il font su mobile.

### [MINOR] Check-in: 16+ campi in colonna unica senza raggruppamento né submit sticky

- **Dove:** src/app/checkin/[token]/CheckinForm.tsx:150 (flex-col gap-4, tutti i campi full-width)
- **Problema:** Il modulo ospite è una colonna lunghissima da scrollare; campi correlati (Sesso+Data, Tipo doc+Numero) non si affiancano nemmeno su tablet, e il submit è in fondo a un form lungo (più il problema font 14px/zoom iOS).
- **Fix:** Raggruppare i campi brevi in grid sm:grid-cols-2 per coppie logiche, submit sticky in fondo viewport su mobile, e font 16px ai campi.

### [MINOR] Hero h1 a 2.9rem su 390px affolla l'above-the-fold

- **Dove:** src/app/dashboard/concierge.css (cmx-hero) / contesto sito app/page.tsx:79
- **Problema:** L'H1 a ~46px su 390px riempie quasi tutta l'altezza utile sopra la piega insieme a lead + trust + CTA, lasciando poco respiro (e col banner cookie sotto sul sito).
- **Fix:** Valutare 2.4-2.6rem su mobile e leading più compatto; ridurre i margini superiori su mobile.

### [POLISH] Selettore lingua check-in senza icona/etichetta di scopo

- **Dove:** src/app/checkin/[token]/page.tsx:18-35 (LangSwitcher: solo nomi lingua in fila)
- **Problema:** Il selettore mostra 'Italiano English Deutsch...' in fila senza icona globo o label: su mobile può sembrare un menu/tab anziché un cambio lingua e occupa spazio accanto al brand.
- **Fix:** Aggiungere icona globo o aria-label visibile e compattare (dropdown lingua corrente) mantenendo i link accessibili.

### [MINOR] Signup: hint password potenzialmente non allineato alla validazione server

- **Dove:** src/app/signup/SignupForm.tsx:14 (PASSWORD_HINT) vs src/server/auth/password.ts
- **Problema:** L'hint 'Almeno 8 caratteri, con lettere e numeri' va verificato che combaci esattamente con la regola server: un mismatch genera errori inspiegabili o falsa sicurezza.
- **Fix:** Allineare hint e regola server in un'unica costante condivisa; verificare in password.ts.

### [POLISH] Animazioni d'ingresso a cascata lunghe (fino ~2s) ritardano la lettura dei dati

- **Dove:** concierge.css (cmx-fadeup delay fino a 1.5-2s) + concierge-kpis.tsx (odometro 1300ms + 140ms/cifra)
- **Problema:** All'apertura dashboard KPI/proposte/agenda/diario appaiono con ritardi cumulati fino a ~2s e gli odometri completano dopo ~1.3s+ partendo da 0: per uno strumento operativo quotidiano è troppo, e il '0' può essere letto come 'nessuna schedina' (anche dagli ipovedenti che leggono lentamente).
- **Fix:** Comprimere i delay (totale <600-700ms) o animare solo al primo accesso; il primo frame deve mostrare già una cifra plausibile, non 0. reduced-motion già gestito.

### [POLISH] Pesi tipografici H1 incoerenti tra dashboard e pagine interne

- **Dove:** concierge.css:188 (.cmx-hero h1 600) vs concierge-page.css:16 (.cmx-pagetitle 500); CardTitle 600
- **Problema:** L'H1 dashboard è Fraunces 600, l'H1 pagine interne 500, i CardTitle 600: il titolo principale cambia peso passando da home a sezione, incoerenza percepibile su un serif display.
- **Fix:** Fissare un solo peso per gli H1 di pagina (500 o 600 ovunque) e una scala tipografica documentata (H1/H2/CardTitle) usata da entrambi i sistemi.

### [POLISH] Affordance KPI cliccabili incoerente: alcuni con 'Riepilogo →', altri div inerti

- **Dove:** src/components/dashboard/concierge-kpis.tsx:161-207 (clickable solo se kpi.detail)
- **Problema:** I KPI con detail sono <button> con tilt 3D e CTA 'Riepilogo →'; quelli senza sono <div> identici nell'aspetto ma inerti: l'utente prova a cliccare KPI che non rispondono o non scopre quelli che si aprono.
- **Fix:** Distinguere chiaramente i KPI interattivi (solo loro mostrano CTA e cursor pointer) o rendere tutti i KPI coerenti nell'interazione.

### [POLISH] Select native vs Combobox parallelo, freccia con hex hardcoded senza stato

- **Dove:** src/components/ui/select.tsx (freccia stroke #5b5347) e ui/combobox.tsx (6.6KB)
- **Problema:** Esistono sia Select nativo stilizzato sia un Combobox custom (rischio look/comportamento diversi nelle stesse form); la freccia del Select è un hex hardcoded e non cambia in focus/hover.
- **Fix:** Documentare quando usare Select vs Combobox (o unificarli), portare la freccia al token via currentColor, dare feedback in focus.

### [POLISH] Dashboard signOut form senza pending/disabled durante il submit

- **Dove:** src/app/dashboard/page.tsx:65-71
- **Problema:** Il bottone 'Esci' è un <button> nudo dentro un form server-action: durante il signOut non c'è stato pending/disabled, cliccabile più volte (mentre altrove si usa SubmitButton).
- **Fix:** Usare SubmitButton (useFormStatus → aria-busy + disabled) anche per il logout.

### [POLISH] Metadata title 'Agenzia' incoerente con H1 'Le tue strutture' e nav 'Strutture'

- **Dove:** src/app/agency/page.tsx:16 (title) vs :74-78 (H1) vs quicknav 'Strutture'
- **Problema:** La stessa pagina si chiama 'Agenzia' nel tab, 'Le tue strutture' nell'H1, 'Strutture' nella quicknav e ha kicker variabile: quattro nomi per una destinazione, erode l'orientamento.
- **Fix:** Scegliere un nome canonico (es. 'Strutture') e usarlo in metadata title, H1, kicker e nav.

### [POLISH] Effetti hover/tilt 3D dei KPI e righe lasciano stati appiccicosi su touch

- **Dove:** concierge-kpis.tsx:92-110 (useTilt mousemove) + concierge.css:99,308 (.cmx-row/.cmx-kpi:hover)
- **Problema:** Il tilt 3D e gli :hover (translateY/box-shadow) su touch non si attivano ma lasciano stati appiccicosi dopo il tap (card sollevata finché non si tocca altrove), glitch mobile tipico.
- **Fix:** Racchiudere gli effetti in @media (hover:hover) and (pointer:fine), così sono attivi solo su puntatori precisi e il touch non lascia stati hover residui.

### [POLISH] Skip-link duplicato tra i due gusci, rischio id 'main-content' doppio

- **Dove:** site-header.tsx:13-19 (#main-content) e concierge-page.tsx:55-60,92 (proprio skip-link + main id duplicato)
- **Problema:** Due skip-link con stili diversi; se una pagina montasse entrambi i gusci si avrebbero due 'Salta al contenuto' e due id main-content (id duplicato = invalido).
- **Fix:** Centralizzare lo skip-link in un solo componente con un unico id='main-content' per documento; uniformare lo stile via token.

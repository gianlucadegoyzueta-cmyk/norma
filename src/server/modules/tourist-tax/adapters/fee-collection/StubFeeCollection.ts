// ============================================================
//  ADAPTER STUB: incasso commissione Norma — NON muove denaro. Default sicuro.
//
//  Finché il gate monetario è chiuso (decisione del founder), questo è l'unico adapter:
//  ritorna sempre NOT_IMPLEMENTED. Esiste per dimostrare che il port è cablabile e per dare
//  alla UI un esito esplicito ("incasso non attivo") invece di un silenzio ambiguo.
//
//  Sostituirlo con un adapter Stripe Connect è un lavoro a sé, dietro decisione esplicita.
// ============================================================

import type {
  FeeCollectionChannel,
  FeeCollectionContext,
  FeeCollectionResult,
} from "../../ports/FeeCollectionChannel";

export class StubFeeCollection implements FeeCollectionChannel {
  readonly isImplemented = false;

  async collect(_ctx: FeeCollectionContext): Promise<FeeCollectionResult> {
    return {
      kind: "NOT_IMPLEMENTED",
      message:
        "L'incasso reale della commissione Norma non è attivo. La ripartizione è calcolata e " +
        "registrata, ma nessun denaro viene movimentato: richiede una decisione del founder " +
        "(Stripe Connect, money transmission).",
    };
  }
}

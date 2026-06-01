import type { CinVerifier } from "../ports/CinVerifier";

/** Stub: nessuna chiamata di rete. Il CIN si valida solo sul formato in dominio. */
export class StubCinVerifier implements CinVerifier {
  async verify(_cin: string): Promise<{ verified: false; reason: "not_implemented" }> {
    return { verified: false, reason: "not_implemented" };
  }
}

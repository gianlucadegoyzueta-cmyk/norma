// Accesso centralizzato alle variabili d'ambiente.
// Lazy + esplicito: solleviamo un errore chiaro solo quando una variabile
// richiesta viene effettivamente usata (così non blocchiamo build/tooling).

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variabile d'ambiente mancante: ${name}`);
  }
  return value;
}

export const env = {
  get databaseUrl(): string {
    return required("DATABASE_URL");
  },
  get nodeEnv(): string {
    return process.env.NODE_ENV ?? "development";
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
};

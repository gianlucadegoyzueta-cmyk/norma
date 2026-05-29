import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AlloggiatiSecret, SecretsVault } from "./SecretsVault";

// Implementazione di SVILUPPO del SecretsVault.
// Cifra i segreti con AES-256-GCM e li salva su file nella cartella ".localsecrets/"
// (in .gitignore). Dimostra il principio corretto — niente segreti in chiaro — senza
// dipendere da infrastruttura esterna.
//
// In PRODUZIONE va sostituita da un backend reale (AWS Secrets Manager, HashiCorp
// Vault, GCP Secret Manager) con envelope encryption e chiavi per-tenant.
// L'interfaccia SecretsVault non cambia: il resto del codice resta identico.

const ALGO = "aes-256-gcm";
const STORE_DIR = path.join(process.cwd(), ".localsecrets");

interface EncryptedBlob {
  iv: string;
  authTag: string;
  data: string;
}

/// Legge e valida la chiave locale (32 byte = 64 caratteri esadecimali).
function getKey(): Buffer {
  const hex = process.env.SECRETS_LOCAL_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "SECRETS_LOCAL_KEY mancante o non valida: servono 64 caratteri esadecimali " +
        "(32 byte). Generala con:  openssl rand -hex 32",
    );
  }
  return Buffer.from(hex, "hex");
}

export class LocalSecretsVault implements SecretsVault {
  async store(secret: AlloggiatiSecret): Promise<string> {
    const ref = randomUUID();
    await this.write(ref, secret);
    return ref;
  }

  async retrieve(ref: string): Promise<AlloggiatiSecret> {
    const raw = await readFile(this.file(ref), "utf8");
    const blob = JSON.parse(raw) as EncryptedBlob;
    const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(blob.iv, "hex"));
    decipher.setAuthTag(Buffer.from(blob.authTag, "hex"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(blob.data, "hex")),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString("utf8")) as AlloggiatiSecret;
  }

  async update(ref: string, secret: AlloggiatiSecret): Promise<void> {
    if (!existsSync(this.file(ref))) {
      throw new Error(`Riferimento segreto non trovato: ${ref}`);
    }
    await this.write(ref, secret);
  }

  async delete(ref: string): Promise<void> {
    if (existsSync(this.file(ref))) {
      await unlink(this.file(ref));
    }
  }

  private file(ref: string): string {
    return path.join(STORE_DIR, `${ref}.json`);
  }

  private async write(ref: string, secret: AlloggiatiSecret): Promise<void> {
    await mkdir(STORE_DIR, { recursive: true });
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGO, getKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(secret), "utf8"),
      cipher.final(),
    ]);
    const blob: EncryptedBlob = {
      iv: iv.toString("hex"),
      authTag: cipher.getAuthTag().toString("hex"),
      data: encrypted.toString("hex"),
    };
    await writeFile(this.file(ref), JSON.stringify(blob), "utf8");
  }
}

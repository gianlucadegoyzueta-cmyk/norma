import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { AlloggiatiSecret, SecretsVault } from "./SecretsVault";

// Vault dei segreti su DATABASE: cifra AES-256-GCM e salva il blob nella tabella `Secret`.
// `secretRef` = Secret.id. È DUREVOLE e serverless-safe (a differenza del vault su file, che su
// Vercel sparirebbe). La chiave di cifratura (SECRETS_LOCAL_KEY) sta SOLO in env, mai nel DB.

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.SECRETS_LOCAL_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "SECRETS_LOCAL_KEY mancante o non valida: servono 64 caratteri esadecimali (32 byte). " +
        "Generala con: openssl rand -hex 32",
    );
  }
  return Buffer.from(hex, "hex");
}

interface Blob {
  iv: string;
  authTag: string;
  data: string;
}

function encrypt(secret: AlloggiatiSecret): Blob {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(secret), "utf8"), cipher.final()]);
  return {
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
    data: data.toString("hex"),
  };
}

function decrypt(blob: Blob): AlloggiatiSecret {
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(blob.iv, "hex"));
  decipher.setAuthTag(Buffer.from(blob.authTag, "hex"));
  const out = Buffer.concat([decipher.update(Buffer.from(blob.data, "hex")), decipher.final()]);
  return JSON.parse(out.toString("utf8")) as AlloggiatiSecret;
}

export class PrismaSecretsVault implements SecretsVault {
  constructor(private readonly prisma: PrismaClient) {}

  async store(secret: AlloggiatiSecret): Promise<string> {
    const row = await this.prisma.secret.create({ data: encrypt(secret), select: { id: true } });
    return row.id;
  }

  async retrieve(ref: string): Promise<AlloggiatiSecret> {
    const row = await this.prisma.secret.findUnique({ where: { id: ref } });
    if (!row) throw new Error(`Segreto non trovato nel vault: ${ref}`);
    return decrypt(row);
  }

  async update(ref: string, secret: AlloggiatiSecret): Promise<void> {
    await this.prisma.secret.update({ where: { id: ref }, data: encrypt(secret) });
  }

  async delete(ref: string): Promise<void> {
    await this.prisma.secret.delete({ where: { id: ref } }).catch(() => undefined);
  }
}

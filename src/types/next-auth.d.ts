import type { DefaultSession } from "next-auth";

// Aggiunge `id` a session.user (con sessioni database, l'id arriva dall'AdapterUser).
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

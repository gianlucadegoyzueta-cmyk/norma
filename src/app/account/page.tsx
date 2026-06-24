import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bell, CreditCard, KeyRound, Settings2, TriangleAlert } from "lucide-react";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { PrismaNotificationPreferenceRepository } from "@/server/modules/notifications";
import { ConciergePage } from "@/components/concierge/concierge-page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "./ProfileForm";
import { NotificationPreferencesForm } from "./NotificationPreferencesForm";
import { BiometricLockToggle } from "./BiometricLockToggle";

export const metadata: Metadata = { title: "Impostazioni" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { name: true, email: true, passwordHash: true },
  });
  const hasPassword = Boolean(user?.passwordHash);
  const loginMethod = hasPassword ? "Email e password" : "Account Google";
  const credentialCount = await prisma.alloggiatiCredential.count({
    where: { organizationId: ctx.current.organizationId },
  });
  // Consenso notifiche per-pilastro. Degrada al default opt-in se la tabella non esiste ancora
  // (migrazione PR2 non applicata): l'UI funziona comunque.
  const consent = await new PrismaNotificationPreferenceRepository(prisma).get(ctx.user.id);

  return (
    <ConciergePage
      dense
      active="account"
      kicker="IMPOSTAZIONI · NORMA"
      title="Impostazioni"
      intro="Il tuo profilo, l'accesso, le connessioni e le preferenze dell'account."
    >
      {/* Profilo */}
      <section className="cmx-section" style={{ marginTop: 0 }}>
        <Card style={{ borderRadius: 18 }}>
          <CardHeader>
            <CardTitle>Profilo</CardTitle>
            <CardDescription>Come ti chiami e con quale indirizzo accedi.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <ProfileForm initialName={user?.name ?? ""} />
            <div className="grid gap-3 border-t pt-4" style={{ borderColor: "var(--hairline)" }}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground text-sm">Email</span>
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground text-sm">Metodo di accesso</span>
                <span className="text-sm font-medium">{loginMethod}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Sicurezza */}
      <section className="cmx-section">
        <Card style={{ borderRadius: 18 }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4" /> Sicurezza
            </CardTitle>
            <CardDescription>
              {hasPassword
                ? "Cambia la password del tuo account."
                : "Accedi con Google. Puoi anche impostare una password come accesso alternativo."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/forgot">
              <Button variant="outline" size="sm">
                {hasPassword ? "Cambia password" : "Imposta una password"}
              </Button>
            </Link>
            <p className="text-muted-foreground mt-2 text-xs">
              Ti invieremo un link via email per procedere in sicurezza.
            </p>
            {/* Blocco biometrico: visibile solo in app nativa (no-op su web). */}
            <BiometricLockToggle />
          </CardContent>
        </Card>
      </section>

      {/* Connessioni (sola lettura → /credentials) */}
      <section className="cmx-section">
        <Card style={{ borderRadius: 18 }}>
          <CardHeader>
            <CardTitle>Connessioni</CardTitle>
            <CardDescription>
              Le credenziali con cui Norma lavora per te. La fonte di verità resta la pagina
              Credenziali.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm">
              Credenziali Alloggiati Web:{" "}
              <span className="font-medium">
                {credentialCount} {credentialCount === 1 ? "configurata" : "configurate"}
              </span>
            </span>
            <Link href="/credentials">
              <Button variant="outline" size="sm">
                Gestisci credenziali <ArrowRight className="size-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Fatturazione (sola lettura → /billing, dove vivono anche i dati fiscali) */}
      <section className="cmx-section">
        <Card style={{ borderRadius: 18 }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-4" /> Fatturazione
            </CardTitle>
            <CardDescription>
              Abbonamento, metodo di pagamento, fatture e dati fiscali (P.IVA / Codice Fiscale).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/billing">
              <Button variant="outline" size="sm">
                Gestisci abbonamento <ArrowRight className="size-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Notifiche + Preferenze — in arrivo (richiedono un nuovo modello dati) */}
      <section className="cmx-section grid gap-4 sm:grid-cols-2">
        <Card style={{ borderRadius: 18 }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-4" /> Notifiche
            </CardTitle>
            <CardDescription>
              Promemoria scadenze Alloggiati e ISTAT, avvisi di invio fallito.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationPreferencesForm initial={consent} />
          </CardContent>
        </Card>
        <Card style={{ borderRadius: 18 }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="size-4" /> Preferenze
            </CardTitle>
            <CardDescription>Lingua, fuso orario, formato delle date.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">
              Qui sceglierai lingua, fuso orario e formato delle date — in arrivo.
            </p>
            <span className="cmx-badge cmx-badge-wait shrink-0">In arrivo</span>
          </CardContent>
        </Card>
      </section>

      {/* Zona pericolo — guardrailata, nessuna azione distruttiva secca (CRITICAL) */}
      <section className="cmx-section">
        <Card className="border-destructive/30" style={{ borderRadius: 18 }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TriangleAlert className="text-destructive size-4" /> Zona pericolo
            </CardTitle>
            <CardDescription>
              Eliminare l&apos;account o l&apos;organizzazione è irreversibile e tocca dati di
              compliance (credenziali, ospiti, abbonamento). La gestiamo insieme a te, non con un
              clic.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div
              className="grid gap-2.5 rounded-xl border p-4"
              style={{ borderColor: "var(--hairline)", background: "var(--carta)" }}
            >
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Cosa è collegato a questo account
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground text-sm">Organizzazione</span>
                <span className="text-sm font-medium">{ctx.current.organizationName}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground text-sm">Email</span>
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground text-sm">Credenziali collegate</span>
                <span className="text-sm font-medium tabular-nums">
                  {credentialCount} {credentialCount === 1 ? "configurata" : "configurate"}
                </span>
              </div>
            </div>
            <Link href="/support">
              <Button variant="outline" size="sm">
                Richiedi l&apos;eliminazione
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </ConciergePage>
  );
}

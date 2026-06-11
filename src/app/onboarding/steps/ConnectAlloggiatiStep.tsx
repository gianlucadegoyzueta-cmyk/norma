"use client";

import { useActionState, useEffect, useRef } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { describedById, Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { connectCredentialAction, syncReferenceTablesAction } from "../actions";

export function ConnectAlloggiatiStep({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const [connState, connAction] = useActionState(connectCredentialAction, null);
  const [syncState, syncAction, syncPending] = useActionState(syncReferenceTablesAction, null);
  const syncStarted = useRef(false);
  const advanced = useRef(false);

  // Verifica OK → avvia AUTOMATICAMENTE la sync delle tabelle (invisibile).
  useEffect(() => {
    if (connState?.ok && connState.credentialId && !syncStarted.current) {
      syncStarted.current = true;
      const fd = new FormData();
      fd.set("credentialId", connState.credentialId);
      syncAction(fd);
    }
  }, [connState, syncAction]);

  // Sync OK → avanti.
  useEffect(() => {
    if (syncState?.ok && !advanced.current) {
      advanced.current = true;
      onNext();
    }
  }, [syncState, onNext]);

  function retrySync() {
    if (!connState?.credentialId) return;
    const fd = new FormData();
    fd.set("credentialId", connState.credentialId);
    syncAction(fd);
  }

  const verified = Boolean(connState?.ok && connState.credentialId);
  const fe = connState && !connState.ok ? connState.fieldErrors : undefined;

  // FASE post-verifica: preparazione tabelle (loading) o errore sync (riprova/salta).
  if (verified) {
    const syncFailed = Boolean(syncState && !syncState.ok);
    return (
      <div className="mx-auto w-full max-w-md text-center">
        {!syncFailed ? (
          <div className="flex flex-col items-center gap-4 py-8" role="status" aria-live="polite">
            <span
              aria-hidden
              className="bg-success/12 text-success flex size-12 items-center justify-center rounded-full text-xl"
            >
              ✓
            </span>
            <div className="space-y-1">
              <p className="font-medium">Credenziale verificata</p>
              <p className="text-muted-foreground inline-flex items-center gap-2 text-sm">
                <Spinner className="size-4" /> Preparo le tabelle dei comuni…
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-6">
            <FormMessage>{syncState?.message}</FormMessage>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={retrySync} disabled={syncPending}>
                {syncPending ? <Spinner className="size-4" /> : null}
                Riprova
              </Button>
              <Button type="button" onClick={onNext}>
                Salta e prosegui
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <header className="ob-reveal mb-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Apriamo il canale con la Questura
        </h2>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          Mi servono le credenziali della tua utenza Alloggiati Web: è il filo con cui comunico le
          schedine. Le custodisco <strong className="text-foreground">cifrate nel vault</strong>{" "}
          (mai in chiaro) e le provo subito con un test — senza inviare nulla.
        </p>
      </header>

      <details className="mb-4 text-sm">
        <summary className="text-primary focus-visible:ring-ring inline-flex cursor-pointer items-center rounded outline-none focus-visible:ring-2 focus-visible:ring-offset-1">
          Dove trovo la WSKey?
        </summary>
        <p className="text-muted-foreground mt-1 leading-relaxed">
          La WSKey è la chiave del Web Service, diversa dalla password del portale. La trovi
          nell&apos;area “Web Service” di Alloggiati Web, dopo aver generato/scaricato il
          certificato.{" "}
          <a
            href="https://alloggiatiweb.poliziadistato.it"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2"
          >
            Apri il portale
          </a>
          .
        </p>
      </details>

      <form action={connAction} className="grid gap-4">
        {connState && !connState.ok && !fe ? <FormMessage>{connState.message}</FormMessage> : null}

        <Field
          id="ob-label"
          label="Etichetta"
          hint="Un nome per riconoscerla, es. “Casa Trastevere”."
          error={fe?.label}
        >
          <Input
            id="ob-label"
            name="label"
            required
            placeholder="Casa Trastevere"
            aria-invalid={fe?.label ? true : undefined}
            aria-describedby={describedById("ob-label", { hint: !fe?.label, error: !!fe?.label })}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="ob-category" label="Tipo credenziale">
            <Select id="ob-category" name="category" defaultValue="SINGOLA">
              <option value="SINGOLA">Struttura singola</option>
              <option value="GESTIONE_APPARTAMENTI">Gestione appartamenti</option>
            </Select>
          </Field>
          <Field id="ob-provincia" label="Provincia (sigla)" error={fe?.provincia}>
            <Input
              id="ob-provincia"
              name="provincia"
              required
              maxLength={2}
              placeholder="RM"
              className={cn("uppercase", fe?.provincia && "border-destructive")}
              aria-invalid={fe?.provincia ? true : undefined}
              aria-describedby={describedById("ob-provincia", { error: !!fe?.provincia })}
            />
          </Field>
        </div>

        <div className="bg-muted text-muted-foreground flex items-center gap-2 rounded-md px-3 py-2 text-xs">
          <Lock className="size-3.5 shrink-0" aria-hidden />
          Credenziali salvate cifrate nel vault, mai in chiaro.
        </div>

        <Field id="ob-utente" label="Utente" error={fe?.utente}>
          <Input
            id="ob-utente"
            name="utente"
            required
            autoComplete="off"
            aria-invalid={fe?.utente ? true : undefined}
            aria-describedby={describedById("ob-utente", { error: !!fe?.utente })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="ob-password" label="Password" error={fe?.password}>
            <Input
              id="ob-password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              aria-invalid={fe?.password ? true : undefined}
              aria-describedby={describedById("ob-password", { error: !!fe?.password })}
            />
          </Field>
          <Field id="ob-wskey" label="WSKey" error={fe?.wskey}>
            <Input
              id="ob-wskey"
              name="wskey"
              type="password"
              required
              autoComplete="off"
              aria-invalid={fe?.wskey ? true : undefined}
              aria-describedby={describedById("ob-wskey", { error: !!fe?.wskey })}
            />
          </Field>
        </div>

        <div className="mt-1 flex gap-2">
          <Button type="button" variant="ghost" onClick={onBack}>
            Indietro
          </Button>
          <SubmitButton className="flex-1" pendingLabel="Verifico la credenziale…">
            Collega e verifica
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}

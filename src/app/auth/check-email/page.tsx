import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResendMagicLink } from "./ResendMagicLink";

export const metadata: Metadata = { title: "Controlla la tua email" };

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <AuthShell>
      <Card>
        <CardHeader className="items-center text-center">
          <span
            aria-hidden
            className="bg-primary/10 text-primary mb-2 flex size-12 items-center justify-center rounded-full"
          >
            <Mail className="size-6" />
          </span>
          <CardTitle>Controlla la tua email</CardTitle>
          <CardDescription>
            {email ? (
              <>
                Ti abbiamo inviato un link di accesso a{" "}
                <strong className="text-foreground">{email}</strong>. Aprilo da questo dispositivo
                per entrare.
              </>
            ) : (
              <>Ti abbiamo inviato un link di accesso. Aprilo da questo dispositivo per entrare.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-center text-xs">
            Non lo trovi? Controlla nello spam, oppure richiedilo di nuovo.
          </p>
          {email ? <ResendMagicLink email={email} /> : null}
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="size-4" />
            Torna al login
          </Link>
        </CardContent>
      </Card>
    </AuthShell>
  );
}

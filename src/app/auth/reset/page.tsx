import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Reimposta la password" };

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Imposta una nuova password</CardTitle>
          <CardDescription>Scegli una password nuova per il tuo account.</CardDescription>
        </CardHeader>
        <CardContent>
          {token ? (
            <ResetForm token={token} />
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-muted-foreground text-sm">
                Link non valido o incompleto. Richiedi un nuovo link di reset.
              </p>
              <Link href="/auth/forgot" className="w-full">
                <Button className="w-full">Richiedi un nuovo link</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
}

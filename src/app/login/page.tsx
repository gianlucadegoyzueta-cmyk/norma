import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { signIn } from "@/auth";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = { title: "Accedi" };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
      {/* Sfondo decorativo a gradiente. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--color-primary)_18%,transparent),transparent)]"
      />
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Accedi</CardTitle>
            <CardDescription>
              Inserisci la tua email: ti invieremo un link sicuro per entrare (magic link).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={async (formData: FormData) => {
                "use server";
                const email = String(formData.get("email") ?? "").trim();
                if (email) {
                  await signIn("nodemailer", { email, redirectTo: "/dashboard" });
                }
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="tu@esempio.it"
                />
              </div>
              <Button type="submit" className="w-full">
                <Mail />
                Invia magic link
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-muted-foreground mt-4 text-center text-xs">
          In sviluppo il link viene stampato nella console del server (nessuna email reale
          necessaria).
        </p>
      </div>
    </main>
  );
}

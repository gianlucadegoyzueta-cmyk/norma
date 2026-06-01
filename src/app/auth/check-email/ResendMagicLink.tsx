"use client";

import { useActionState } from "react";
import { sendMagicLink } from "@/app/login/actions";
import { FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/** Reinvio del magic link: riusa la stessa server action (in caso di successo ricarica questa pagina). */
export function ResendMagicLink({ email }: { email: string }) {
  const [state, action] = useActionState(sendMagicLink, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="email" value={email} />
      <FormMessage>{state.error}</FormMessage>
      <SubmitButton variant="outline" className="w-full" pendingLabel="Reinvio…">
        Reinvia il link
      </SubmitButton>
    </form>
  );
}

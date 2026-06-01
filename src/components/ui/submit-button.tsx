"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * Bottone di submit con stato di caricamento automatico (legge `useFormStatus` del <form> padre).
 * Mostra lo spinner e disabilita durante l'invio, con `aria-busy` per gli screen reader.
 */
export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  ...props
}: ButtonProps & { pendingLabel?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending ? <Spinner /> : null}
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  );
}

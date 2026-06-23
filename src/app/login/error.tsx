"use client";

import { AuthRouteError } from "@/components/auth-route-error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AuthRouteError
      error={error}
      reset={reset}
      message="Non siamo riusciti a caricare la pagina di accesso."
    />
  );
}

"use client";

import { AuthRouteError } from "@/components/auth-route-error";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AuthRouteError reset={reset} />;
}

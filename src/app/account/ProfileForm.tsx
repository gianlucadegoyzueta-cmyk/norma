"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateNameAction } from "./actions";

export function ProfileForm({ initialName }: { initialName: string }) {
  const [state, action, pending] = useActionState(updateNameAction, null);
  return (
    <form action={action} className="grid gap-3 sm:max-w-sm">
      <div className="grid gap-1.5">
        <label htmlFor="name" className="text-muted-foreground text-xs font-medium">
          Nome e cognome
        </label>
        <Input
          id="name"
          name="name"
          defaultValue={initialName}
          maxLength={120}
          autoComplete="name"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvo…" : "Salva"}
        </Button>
        {state && (
          <span
            className={state.ok ? "text-success text-xs" : "text-destructive text-xs"}
            role="status"
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}

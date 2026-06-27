"use client";

import { useActionState } from "react";
import type { MembershipRole } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { addTeamMemberAction } from "./actions";

const ROLE_OPTIONS: { value: MembershipRole; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "MEMBER", label: "Member" },
  { value: "OWNER", label: "Owner" },
];

export function InviteTeamMemberForm({ canAssignOwner }: { canAssignOwner: boolean }) {
  const [state, action] = useActionState(addTeamMemberAction, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_170px_auto] sm:items-end">
      <div className="grid gap-1.5">
        <label htmlFor="team-invite-email" className="text-muted-foreground text-xs font-medium">
          Email utente
        </label>
        <Input
          id="team-invite-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="collega@esempio.it"
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="team-invite-role" className="text-muted-foreground text-xs font-medium">
          Ruolo
        </label>
        <select
          id="team-invite-role"
          name="role"
          className="border-input bg-background h-11 rounded-md border px-3 text-sm md:h-10"
          defaultValue="MEMBER"
        >
          {ROLE_OPTIONS.filter((opt) => canAssignOwner || opt.value !== "OWNER").map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton size="sm" pendingLabel="Salvo…">
        Aggiungi membro
      </SubmitButton>
      {state && (
        <p
          className={
            state.ok
              ? "text-success text-xs sm:col-span-3"
              : "text-destructive text-xs sm:col-span-3"
          }
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

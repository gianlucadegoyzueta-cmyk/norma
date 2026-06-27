"use client";

import { useActionState } from "react";
import type { MembershipRole } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { createTeamInviteLinkAction } from "./actions";

const ROLE_OPTIONS: { value: MembershipRole; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "MEMBER", label: "Member" },
  { value: "OWNER", label: "Owner" },
];

export function TeamInviteLinkForm({ canAssignOwner }: { canAssignOwner: boolean }) {
  const [state, action] = useActionState(createTeamInviteLinkAction, null);
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_170px_auto] sm:items-end">
        <div className="grid gap-1.5">
          <label htmlFor="invite-link-email" className="text-muted-foreground text-xs font-medium">
            Email invitato
          </label>
          <Input
            id="invite-link-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="nuovo.membro@esempio.it"
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="invite-link-role" className="text-muted-foreground text-xs font-medium">
            Ruolo
          </label>
          <select
            id="invite-link-role"
            name="role"
            defaultValue="MEMBER"
            className="border-input bg-background h-11 rounded-md border px-3 text-sm md:h-10"
          >
            {ROLE_OPTIONS.filter((opt) => canAssignOwner || opt.value !== "OWNER").map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <SubmitButton size="sm" pendingLabel="Creo…">
          Crea link invito
        </SubmitButton>
      </div>
      {state?.link ? (
        <div className="grid gap-1.5">
          <label htmlFor="invite-link-output" className="text-muted-foreground text-xs font-medium">
            Link invito (7 giorni)
          </label>
          <Input
            id="invite-link-output"
            readOnly
            value={state.link}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      ) : null}
      {state ? (
        <p className={state.ok ? "text-success text-xs" : "text-destructive text-xs"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

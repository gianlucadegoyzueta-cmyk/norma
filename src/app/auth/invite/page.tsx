import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyTeamInviteToken } from "@/server/auth/invite-token";
import { prisma } from "@/server/db";

export const metadata: Metadata = { title: "Invito team" };

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token ?? "";
  const invite = token ? verifyTeamInviteToken(token) : null;

  if (!invite) {
    return (
      <AuthShell>
        <Card>
          <CardHeader>
            <CardTitle>Invito non valido</CardTitle>
            <CardDescription>
              Questo link è scaduto o non è stato firmato correttamente. Chiedi un nuovo invito.
            </CardDescription>
          </CardHeader>
        </Card>
      </AuthShell>
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return (
      <AuthShell>
        <Card>
          <CardHeader>
            <CardTitle>Invito a {invite.orgName}</CardTitle>
            <CardDescription>
              Sei stato invitato come {invite.role}. Accedi (o crea account) con {invite.email} e
              riapri questo link per completare l&apos;ingresso nel team.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Link href={`/login?invite=${encodeURIComponent(token)}`}>
              <Button>Accedi</Button>
            </Link>
            <Link href={`/signup?invite=${encodeURIComponent(token)}`}>
              <Button variant="outline">Crea account</Button>
            </Link>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true },
  });
  if (!user?.email || user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <AuthShell>
        <Card>
          <CardHeader>
            <CardTitle>Email non corrispondente</CardTitle>
            <CardDescription>
              Questo invito è per {invite.email}. Accedi con quell&apos;account per accettarlo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/account">
              <Button variant="outline">Torna all&apos;account corrente</Button>
            </Link>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: invite.orgId },
    select: { id: true },
  });
  if (!org) {
    return (
      <AuthShell>
        <Card>
          <CardHeader>
            <CardTitle>Organizzazione non disponibile</CardTitle>
            <CardDescription>
              L&apos;organizzazione associata all&apos;invito non esiste piu. Chiedi un nuovo
              invito.
            </CardDescription>
          </CardHeader>
        </Card>
      </AuthShell>
    );
  }

  const existing = await prisma.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: invite.orgId,
        userId: user.id,
      },
    },
    select: { id: true, role: true },
  });
  if (existing) {
    if (existing.role !== "OWNER" && existing.role !== invite.role) {
      await prisma.membership.update({ where: { id: existing.id }, data: { role: invite.role } });
    }
  } else {
    await prisma.membership.create({
      data: { organizationId: invite.orgId, userId: user.id, role: invite.role },
    });
  }

  redirect("/account");
}

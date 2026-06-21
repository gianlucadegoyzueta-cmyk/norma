// HELPER LOCALE (non committare): seed minimo per il click-through autenticato su DB locale.
// Crea Org + User(password) + Membership OWNER. DATABASE_URL va passata inline (DB locale).
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const EMAIL = "test@local.dev";
const PASSWORD = "Test1234!";

const prisma = new PrismaClient();
try {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { passwordHash },
    create: { email: EMAIL, name: "Tester Locale", passwordHash },
  });
  const existing = await prisma.membership.findFirst({ where: { userId: user.id } });
  if (!existing) {
    const org = await prisma.organization.create({ data: { name: "Demo Locale" } });
    await prisma.membership.create({
      data: { organizationId: org.id, userId: user.id, role: "OWNER" },
    });
    console.log("org+membership creati:", org.id);
  } else {
    console.log("membership già presente");
  }
  console.log(`SEED OK → ${EMAIL} / ${PASSWORD} (userId ${user.id})`);
} finally {
  await prisma.$disconnect();
}

import { expect, test } from "@playwright/test";
import { hashPassword } from "../src/server/auth/password";
import { prisma } from "../src/server/db";

/**
 * Smoke E2E: il "quality gate" che mancava. Non prova logica di dominio (quella è nei
 * test unit/integration), ma verifica che l'app si avvii e che i percorsi pubblici e di
 * autenticazione reggano end-to-end in un browser reale. Deve restare veloce.
 */

test("GET /api/health risponde 200 con status ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe("ok");
});

test("/login renderizza il form di accesso", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Bentornato" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Accedi" })).toBeVisible();
});

test("/signup valida la password debole senza creare l'account", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Crea il tuo account" })).toBeVisible();

  await page.getByLabel("Il tuo nome").fill("Mario Rossi");
  await page.getByLabel("Nome dell'organizzazione").fill("Rossi Affitti");
  await page.getByLabel("Email").fill("mario@esempio.it");
  // Password troppo corta: la validazione lato server deve respingerla PRIMA di toccare il DB.
  await page.getByLabel("Password").fill("abc");
  await page.getByRole("button", { name: "Crea account" }).click();

  await expect(page.getByText(/almeno 8 caratteri/i)).toBeVisible();
  // Restiamo sulla pagina di registrazione: nessun redirect a onboarding/login.
  await expect(page).toHaveURL(/\/signup$/);
});

test("/dashboard reindirizza a /login se anonimo", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login(\?|$)/);
  await expect(page.getByRole("heading", { name: "Bentornato" })).toBeVisible();
});

test("rotte protette principali reindirizzano a /login se anonimo", async ({ page }) => {
  for (const path of ["/schedine", "/stays", "/properties", "/billing", "/istat", "/tourist-tax"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login(\?|$)/);
    await expect(page.getByRole("heading", { name: "Bentornato" })).toBeVisible();
  }
});

test("/checkin con token inesistente mostra l'avviso, senza errore 500", async ({ page }) => {
  const res = await page.goto("/checkin/token-finto-inesistente");
  // La pagina gestisce il token invalido con grazia (avviso, non un crash del server).
  expect(res?.status()).toBeLessThan(500);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("switch organizzazione mantiene isolamento su /agency", async ({ page }) => {
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const email = `switch-${nonce}@example.test`;
  const password = "Password123!";
  const orgName = `Org Base ${nonce}`;
  const secondOrgName = `Org Switch ${nonce}`;
  const primaryPropertyName = `Casa Base ${nonce}`;
  const secondPropertyName = `Casa Switch ${nonce}`;
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      name: "Switch Tester",
      passwordHash,
    },
    select: { id: true },
  });

  const comune = await prisma.comune.findFirst({ select: { id: true } });
  expect(comune?.id).toBeTruthy();

  const firstOrg = await prisma.organization.create({
    data: { name: orgName },
    select: { id: true, name: true },
  });
  const secondOrg = await prisma.organization.create({
    data: { name: secondOrgName },
    select: { id: true, name: true },
  });
  await prisma.membership.create({
    data: { organizationId: firstOrg.id, userId: user.id, role: "OWNER" },
  });
  await prisma.membership.create({
    data: { organizationId: secondOrg.id, userId: user.id, role: "ADMIN" },
  });
  await prisma.property.createMany({
    data: [
      {
        organizationId: firstOrg.id,
        name: primaryPropertyName,
        address: "Via Roma 1",
        comuneId: comune!.id,
        proprietario: "Mario Rossi",
      },
      {
        organizationId: secondOrg.id,
        name: secondPropertyName,
        address: "Via Milano 2",
        comuneId: comune!.id,
        proprietario: "Luigi Bianchi",
      },
    ],
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/agency");
  await expect(page.getByText(primaryPropertyName)).toBeVisible();
  await expect(page.getByText(secondPropertyName)).toHaveCount(0);

  await page.getByRole("button", { name: new RegExp(firstOrg.name) }).click();
  await page
    .locator(`form:has(input[name="organizationId"][value="${secondOrg.id}"])`)
    .evaluate((form: HTMLFormElement) => form.requestSubmit());

  await expect(page).toHaveURL(/\/agency(\?|$)/);
  await expect(page.getByText(secondPropertyName)).toBeVisible();
  await expect(page.getByText(primaryPropertyName)).toHaveCount(0);
});

import { expect, test } from "@playwright/test";

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

test("/checkin con token inesistente mostra l'avviso, senza errore 500", async ({ page }) => {
  const res = await page.goto("/checkin/token-finto-inesistente");
  // La pagina gestisce il token invalido con grazia (avviso, non un crash del server).
  expect(res?.status()).toBeLessThan(500);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

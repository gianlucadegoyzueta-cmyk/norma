-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "CredentialCategory" AS ENUM ('SINGOLA', 'GESTIONE_APPARTAMENTI');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'PENDING_REONBOARDING', 'INVALID', 'DISABLED');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "TipoAlloggiato" AS ENUM ('OSPITE_SINGOLO', 'CAPO_FAMIGLIA', 'CAPO_GRUPPO', 'FAMILIARE', 'MEMBRO_GRUPPO');

-- CreateEnum
CREATE TYPE "SchedinaStatus" AS ENUM ('PENDING', 'SENDING', 'ACQUIRED', 'REJECTED', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "SubmissionChannel" AS ENUM ('WEB_SERVICE', 'PEC');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlloggiatiCredential" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" "CredentialCategory" NOT NULL,
    "provincia" TEXT NOT NULL,
    "status" "CredentialStatus" NOT NULL DEFAULT 'PENDING_REONBOARDING',
    "secretRef" TEXT NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3),
    "tokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlloggiatiCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "comuneId" TEXT NOT NULL,
    "proprietario" TEXT NOT NULL,
    "credentialId" TEXT,
    "alloggiatiApartmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stay" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "arrivalDate" TIMESTAMP(3) NOT NULL,
    "departureDate" TIMESTAMP(3),
    "guestsCount" INTEGER NOT NULL,
    "isShortStay" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "sex" "Sex" NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "birthCountryId" TEXT NOT NULL,
    "birthComuneId" TEXT,
    "citizenshipId" TEXT NOT NULL,
    "documentTypeId" TEXT,
    "documentNumber" TEXT,
    "documentPlaceId" TEXT,
    "tipoAlloggiato" "TipoAlloggiato" NOT NULL,
    "leaderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedina" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "status" "SchedinaStatus" NOT NULL DEFAULT 'PENDING',
    "channel" "SubmissionChannel" NOT NULL DEFAULT 'WEB_SERVICE',
    "dedupKey" TEXT NOT NULL,
    "payloadSnapshot" TEXT,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastErrorCod" TEXT,
    "lastErrorDes" TEXT,
    "sentAt" TIMESTAMP(3),
    "acquiredAt" TIMESTAMP(3),
    "receiptDate" TIMESTAMP(3),
    "receiptRef" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedinaEvent" (
    "id" TEXT NOT NULL,
    "schedinaId" TEXT NOT NULL,
    "fromStatus" "SchedinaStatus",
    "toStatus" "SchedinaStatus" NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchedinaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comune" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,

    CONSTRAINT "Comune_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TouristTaxConfig" (
    "id" TEXT NOT NULL,
    "comuneId" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),

    CONSTRAINT "TouristTaxConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TouristTaxDeclaration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "comuneId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TouristTaxDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_organizationId_userId_key" ON "Membership"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AlloggiatiCredential_secretRef_key" ON "AlloggiatiCredential"("secretRef");

-- CreateIndex
CREATE INDEX "AlloggiatiCredential_organizationId_idx" ON "AlloggiatiCredential"("organizationId");

-- CreateIndex
CREATE INDEX "AlloggiatiCredential_status_idx" ON "AlloggiatiCredential"("status");

-- CreateIndex
CREATE INDEX "Property_organizationId_idx" ON "Property"("organizationId");

-- CreateIndex
CREATE INDEX "Property_credentialId_idx" ON "Property"("credentialId");

-- CreateIndex
CREATE INDEX "Stay_organizationId_idx" ON "Stay"("organizationId");

-- CreateIndex
CREATE INDEX "Stay_propertyId_idx" ON "Stay"("propertyId");

-- CreateIndex
CREATE INDEX "Guest_organizationId_idx" ON "Guest"("organizationId");

-- CreateIndex
CREATE INDEX "Guest_stayId_idx" ON "Guest"("stayId");

-- CreateIndex
CREATE UNIQUE INDEX "Schedina_guestId_key" ON "Schedina"("guestId");

-- CreateIndex
CREATE INDEX "Schedina_status_idx" ON "Schedina"("status");

-- CreateIndex
CREATE INDEX "Schedina_deadlineAt_idx" ON "Schedina"("deadlineAt");

-- CreateIndex
CREATE UNIQUE INDEX "Schedina_organizationId_dedupKey_key" ON "Schedina"("organizationId", "dedupKey");

-- CreateIndex
CREATE INDEX "SchedinaEvent_schedinaId_idx" ON "SchedinaEvent"("schedinaId");

-- CreateIndex
CREATE UNIQUE INDEX "Comune_code_key" ON "Comune"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentType_code_key" ON "DocumentType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TouristTaxConfig_comuneId_key" ON "TouristTaxConfig"("comuneId");

-- CreateIndex
CREATE UNIQUE INDEX "TouristTaxDeclaration_organizationId_comuneId_period_key" ON "TouristTaxDeclaration"("organizationId", "comuneId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlloggiatiCredential" ADD CONSTRAINT "AlloggiatiCredential_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_comuneId_fkey" FOREIGN KEY ("comuneId") REFERENCES "Comune"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "AlloggiatiCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_birthCountryId_fkey" FOREIGN KEY ("birthCountryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_birthComuneId_fkey" FOREIGN KEY ("birthComuneId") REFERENCES "Comune"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_citizenshipId_fkey" FOREIGN KEY ("citizenshipId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedina" ADD CONSTRAINT "Schedina_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedina" ADD CONSTRAINT "Schedina_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedina" ADD CONSTRAINT "Schedina_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "AlloggiatiCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedinaEvent" ADD CONSTRAINT "SchedinaEvent_schedinaId_fkey" FOREIGN KEY ("schedinaId") REFERENCES "Schedina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TouristTaxConfig" ADD CONSTRAINT "TouristTaxConfig_comuneId_fkey" FOREIGN KEY ("comuneId") REFERENCES "Comune"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TouristTaxDeclaration" ADD CONSTRAINT "TouristTaxDeclaration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TouristTaxDeclaration" ADD CONSTRAINT "TouristTaxDeclaration_comuneId_fkey" FOREIGN KEY ("comuneId") REFERENCES "Comune"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


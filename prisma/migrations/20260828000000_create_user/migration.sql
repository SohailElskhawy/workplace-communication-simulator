CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "authProviderUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_authProviderUserId_key" ON "User"("authProviderUserId");

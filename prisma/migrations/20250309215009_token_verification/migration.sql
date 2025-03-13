/*
  Warnings:

  - You are about to drop the `MagicLinkVerification` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "MagicLinkVerification";

-- CreateTable
CREATE TABLE "TokenVerification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenVerification_email_key" ON "TokenVerification"("email");

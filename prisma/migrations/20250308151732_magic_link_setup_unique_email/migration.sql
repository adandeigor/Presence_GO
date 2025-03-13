/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `MagicLinkVerification` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "MagicLinkVerification_email_key" ON "MagicLinkVerification"("email");

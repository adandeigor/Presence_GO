/*
  Warnings:

  - You are about to drop the column `status` on the `Device` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[identifier]` on the table `Device` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `identifier` to the `Device` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Device" DROP COLUMN "status",
ADD COLUMN     "identifier" TEXT NOT NULL,
ADD COLUMN     "isAuthorized" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "Device_identifier_key" ON "Device"("identifier");

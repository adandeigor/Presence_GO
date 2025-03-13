/*
  Warnings:

  - Changed the type of `validationMethod` on the `Attendance` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `dayOfWeek` to the `Schedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `room` to the `Schedule` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ValidationMethodType" AS ENUM ('QR', 'MANUAL', 'LOCATION');

-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "validationMethod",
ADD COLUMN     "validationMethod" "ValidationMethodType" NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "dayOfWeek" "DayOfWeek" NOT NULL,
ADD COLUMN     "room" TEXT NOT NULL;

-- DropEnum
DROP TYPE "ValidationMethod";

-- CreateTable
CREATE TABLE "ValidationMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ValidationMethodType" NOT NULL,
    "config" JSONB NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidationMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

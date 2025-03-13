/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Schedule` table. All the data in the column will be lost.
  - You are about to drop the column `dayOfWeek` on the `Schedule` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `Schedule` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `Schedule` table. All the data in the column will be lost.
  - Added the required column `endDate` to the `Schedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `Schedule` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('REGULAR', 'TD', 'BACHOTAGE', 'SPECIAL');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_courseId_fkey";

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "deviceInfo" TEXT;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "courseStatus" "CourseStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "scheduleType" "ScheduleType" NOT NULL DEFAULT 'REGULAR';

-- AlterTable
ALTER TABLE "Schedule" DROP COLUMN "createdAt",
DROP COLUMN "dayOfWeek",
DROP COLUMN "endTime",
DROP COLUMN "startTime",
ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "frequency" "Frequency",
ADD COLUMN     "isRecurrent" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

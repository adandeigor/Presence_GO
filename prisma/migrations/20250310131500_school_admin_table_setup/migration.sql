-- CreateTable
CREATE TABLE "School_Admin" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "School_Admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_Admin_schoolId_key" ON "School_Admin"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "School_Admin_admin_id_key" ON "School_Admin"("admin_id");

-- AddForeignKey
ALTER TABLE "School_Admin" ADD CONSTRAINT "School_Admin_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "School_Admin" ADD CONSTRAINT "School_Admin_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

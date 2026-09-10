-- Admission: Application Review
CREATE TYPE "AdmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED');

CREATE TABLE "AdmissionApplication" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "programId" TEXT,
    "incomingYear" INTEGER NOT NULL DEFAULT 1,
    "previousSchool" TEXT,
    "status" "AdmissionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdmissionApplication_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdmissionApplication_status_idx" ON "AdmissionApplication"("status");
CREATE INDEX "AdmissionApplication_programId_idx" ON "AdmissionApplication"("programId");

ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropIndex
DROP INDEX "services_name_key";

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "projectId" TEXT;

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "greeting" TEXT,
    "voiceId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website" TEXT,
    "schedule" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

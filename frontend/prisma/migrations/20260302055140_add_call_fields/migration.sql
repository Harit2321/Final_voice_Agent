-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "amount" DOUBLE PRECISION,
ADD COLUMN     "bookedDate" TEXT,
ADD COLUMN     "bookedTime" TEXT,
ADD COLUMN     "callStartedAt" TEXT,
ADD COLUMN     "callType" TEXT,
ADD COLUMN     "direction" TEXT,
ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "outcome" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "service" TEXT,
ADD COLUMN     "upsellStatus" TEXT,
ADD COLUMN     "upsellSuggestion" TEXT;

-- CreateIndex
CREATE INDEX "conversations_outcome_idx" ON "conversations"("outcome");

-- CreateIndex
CREATE INDEX "conversations_phone_idx" ON "conversations"("phone");

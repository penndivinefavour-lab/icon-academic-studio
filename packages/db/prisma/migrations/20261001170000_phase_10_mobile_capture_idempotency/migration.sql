-- AlterTable
ALTER TABLE "research_notes" ADD COLUMN "clientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "research_notes_projectId_clientId_key"
  ON "research_notes"("projectId", "clientId");

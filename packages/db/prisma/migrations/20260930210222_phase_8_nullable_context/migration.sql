-- AlterTable
ALTER TABLE "ai_generations" ALTER COLUMN "contextType" DROP NOT NULL,
ALTER COLUMN "contextId" DROP NOT NULL;

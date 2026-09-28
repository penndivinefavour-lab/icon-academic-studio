/*
  Warnings:

  - You are about to drop the column `analysis` on the `datasets` table. All the data in the column will be lost.
  - You are about to drop the column `columns` on the `datasets` table. All the data in the column will be lost.
  - You are about to drop the column `file` on the `datasets` table. All the data in the column will be lost.
  - You are about to drop the column `preview` on the `datasets` table. All the data in the column will be lost.
  - Added the required column `format` to the `datasets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "datasets" DROP COLUMN "analysis",
DROP COLUMN "columns",
DROP COLUMN "file",
DROP COLUMN "preview",
ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "columnCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fileSize" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "format" TEXT NOT NULL,
ADD COLUMN     "originalFilename" TEXT,
ADD COLUMN     "profile" TEXT,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'IMPORTED',
ADD COLUMN     "storedPath" TEXT;

-- CreateTable
CREATE TABLE "dataset_columns" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalName" TEXT,
    "index" INTEGER NOT NULL,
    "inferredType" TEXT NOT NULL,
    "nullable" BOOLEAN NOT NULL DEFAULT true,
    "uniqueCount" INTEGER NOT NULL DEFAULT 0,
    "missingCount" INTEGER NOT NULL DEFAULT 0,
    "sampleValues" TEXT NOT NULL DEFAULT '[]',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dataset_columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transformations" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "resultDatasetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transformations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dataset_columns_datasetId_idx" ON "dataset_columns"("datasetId");

-- CreateIndex
CREATE INDEX "dataset_columns_index_idx" ON "dataset_columns"("index");

-- CreateIndex
CREATE INDEX "transformations_datasetId_idx" ON "transformations"("datasetId");

-- CreateIndex
CREATE INDEX "transformations_createdAt_idx" ON "transformations"("createdAt");

-- CreateIndex
CREATE INDEX "datasets_status_idx" ON "datasets"("status");

-- AddForeignKey
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_columns" ADD CONSTRAINT "dataset_columns_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transformations" ADD CONSTRAINT "transformations_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transformations" ADD CONSTRAINT "transformations_resultDatasetId_fkey" FOREIGN KEY ("resultDatasetId") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

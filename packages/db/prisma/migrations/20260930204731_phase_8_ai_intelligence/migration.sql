-- CreateTable
CREATE TABLE "ai_generations" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contextType" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
    "usedProviders" TEXT,
    "modelUsed" TEXT,
    "tokenUsage" TEXT,
    "error" TEXT,
    "safetyFlags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contextType" TEXT,
    "contextId" TEXT,
    "messages" TEXT NOT NULL DEFAULT '[]',
    "aiProviderId" TEXT,
    "modelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_evidence_references" (
    "id" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "sourceId" TEXT,
    "evidenceItemId" TEXT,
    "citationId" TEXT,
    "sectionId" TEXT,
    "claimText" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_evidence_references_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_generations_projectId_idx" ON "ai_generations"("projectId");

-- CreateIndex
CREATE INDEX "ai_generations_contextType_contextId_idx" ON "ai_generations"("contextType", "contextId");

-- CreateIndex
CREATE INDEX "ai_generations_status_idx" ON "ai_generations"("status");

-- CreateIndex
CREATE INDEX "ai_generations_reviewStatus_idx" ON "ai_generations"("reviewStatus");

-- CreateIndex
CREATE INDEX "ai_conversations_projectId_idx" ON "ai_conversations"("projectId");

-- CreateIndex
CREATE INDEX "ai_evidence_references_generationId_idx" ON "ai_evidence_references"("generationId");

-- AddForeignKey
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_aiProviderId_fkey" FOREIGN KEY ("aiProviderId") REFERENCES "ai_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_evidence_references" ADD CONSTRAINT "ai_evidence_references_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "ai_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

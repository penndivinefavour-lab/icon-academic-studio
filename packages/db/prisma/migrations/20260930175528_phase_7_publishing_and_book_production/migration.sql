-- CreateTable
CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "documentId" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "publicationType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "author" TEXT,
    "coAuthors" TEXT NOT NULL DEFAULT '[]',
    "editor" TEXT,
    "publisher" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "edition" TEXT,
    "publicationYear" TEXT,
    "description" TEXT,
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "formattingProfileId" TEXT,
    "coverNotes" TEXT,
    "spineText" TEXT,
    "backCoverDescription" TEXT,
    "authorBio" TEXT,
    "seriesId" TEXT,
    "volumeNumber" TEXT,
    "trimSize" TEXT,
    "orientation" TEXT,
    "gutter" TEXT,
    "bleed" TEXT,
    "printNotes" TEXT,
    "isbn10" TEXT,
    "isbn13" TEXT,
    "isbnValidationStatus" TEXT,
    "copyrightHolder" TEXT,
    "copyrightYear" TEXT,
    "subject" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_contributors" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publication_contributors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_parts" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "partNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publication_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_chapters" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "partId" TEXT,
    "documentSectionId" TEXT,
    "chapterNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "wordTarget" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publication_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_front_matter" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publication_front_matter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_back_matter" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publication_back_matter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_glossary" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "pronunciation" TEXT,
    "chapterId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publication_glossary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_index_entries" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "subterm" TEXT,
    "sectionId" TEXT,
    "blockId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publication_index_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_figures" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "chartId" TEXT,
    "tableId" TEXT,
    "documentSectionId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publication_figures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_series" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publication_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_templates" (
    "id" TEXT NOT NULL,
    "publicationType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "frontMatter" TEXT NOT NULL DEFAULT '[]',
    "backMatter" TEXT NOT NULL DEFAULT '[]',
    "chapterStructure" TEXT NOT NULL DEFAULT '[]',
    "formattingPreset" TEXT,
    "citationStyle" TEXT NOT NULL DEFAULT 'APA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publication_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_validation_runs" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "passedCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publication_validation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_validation_issues" (
    "id" TEXT NOT NULL,
    "validationRunId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityId" TEXT,
    "entityType" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "publication_validation_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PublicationToPublicationTemplate" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "publication_contributors_publicationId_idx" ON "publication_contributors"("publicationId");

-- CreateIndex
CREATE INDEX "publication_parts_publicationId_idx" ON "publication_parts"("publicationId");

-- CreateIndex
CREATE UNIQUE INDEX "publication_parts_publicationId_partNumber_key" ON "publication_parts"("publicationId", "partNumber");

-- CreateIndex
CREATE INDEX "publication_chapters_publicationId_idx" ON "publication_chapters"("publicationId");

-- CreateIndex
CREATE INDEX "publication_chapters_partId_idx" ON "publication_chapters"("partId");

-- CreateIndex
CREATE INDEX "publication_chapters_documentSectionId_idx" ON "publication_chapters"("documentSectionId");

-- CreateIndex
CREATE UNIQUE INDEX "publication_chapters_publicationId_chapterNumber_key" ON "publication_chapters"("publicationId", "chapterNumber");

-- CreateIndex
CREATE INDEX "publication_front_matter_publicationId_idx" ON "publication_front_matter"("publicationId");

-- CreateIndex
CREATE UNIQUE INDEX "publication_front_matter_publicationId_kind_key" ON "publication_front_matter"("publicationId", "kind");

-- CreateIndex
CREATE INDEX "publication_back_matter_publicationId_idx" ON "publication_back_matter"("publicationId");

-- CreateIndex
CREATE UNIQUE INDEX "publication_back_matter_publicationId_kind_key" ON "publication_back_matter"("publicationId", "kind");

-- CreateIndex
CREATE INDEX "publication_glossary_publicationId_idx" ON "publication_glossary"("publicationId");

-- CreateIndex
CREATE INDEX "publication_index_entries_publicationId_idx" ON "publication_index_entries"("publicationId");

-- CreateIndex
CREATE INDEX "publication_figures_publicationId_idx" ON "publication_figures"("publicationId");

-- CreateIndex
CREATE UNIQUE INDEX "publication_figures_publicationId_kind_number_key" ON "publication_figures"("publicationId", "kind", "number");

-- CreateIndex
CREATE UNIQUE INDEX "publication_templates_publicationType_key" ON "publication_templates"("publicationType");

-- CreateIndex
CREATE INDEX "publication_validation_runs_publicationId_idx" ON "publication_validation_runs"("publicationId");

-- CreateIndex
CREATE INDEX "publication_validation_issues_validationRunId_idx" ON "publication_validation_issues"("validationRunId");

-- CreateIndex
CREATE INDEX "publication_validation_issues_resolved_idx" ON "publication_validation_issues"("resolved");

-- CreateIndex
CREATE UNIQUE INDEX "_PublicationToPublicationTemplate_AB_unique" ON "_PublicationToPublicationTemplate"("A", "B");

-- CreateIndex
CREATE INDEX "_PublicationToPublicationTemplate_B_index" ON "_PublicationToPublicationTemplate"("B");

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_formattingProfileId_fkey" FOREIGN KEY ("formattingProfileId") REFERENCES "formatting_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "publication_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_contributors" ADD CONSTRAINT "publication_contributors_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_parts" ADD CONSTRAINT "publication_parts_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_chapters" ADD CONSTRAINT "publication_chapters_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_chapters" ADD CONSTRAINT "publication_chapters_partId_fkey" FOREIGN KEY ("partId") REFERENCES "publication_parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_chapters" ADD CONSTRAINT "publication_chapters_documentSectionId_fkey" FOREIGN KEY ("documentSectionId") REFERENCES "document_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_front_matter" ADD CONSTRAINT "publication_front_matter_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_back_matter" ADD CONSTRAINT "publication_back_matter_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_glossary" ADD CONSTRAINT "publication_glossary_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_glossary" ADD CONSTRAINT "publication_glossary_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "publication_chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_index_entries" ADD CONSTRAINT "publication_index_entries_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_index_entries" ADD CONSTRAINT "publication_index_entries_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "document_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_index_entries" ADD CONSTRAINT "publication_index_entries_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "document_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_figures" ADD CONSTRAINT "publication_figures_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_figures" ADD CONSTRAINT "publication_figures_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "charts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_figures" ADD CONSTRAINT "publication_figures_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_figures" ADD CONSTRAINT "publication_figures_documentSectionId_fkey" FOREIGN KEY ("documentSectionId") REFERENCES "document_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_validation_runs" ADD CONSTRAINT "publication_validation_runs_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_validation_issues" ADD CONSTRAINT "publication_validation_issues_validationRunId_fkey" FOREIGN KEY ("validationRunId") REFERENCES "publication_validation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PublicationToPublicationTemplate" ADD CONSTRAINT "_PublicationToPublicationTemplate_A_fkey" FOREIGN KEY ("A") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PublicationToPublicationTemplate" ADD CONSTRAINT "_PublicationToPublicationTemplate_B_fkey" FOREIGN KEY ("B") REFERENCES "publication_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

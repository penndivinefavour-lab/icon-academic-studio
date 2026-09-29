-- CreateTable
CREATE TABLE "evidence_section_links" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "documentSectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_section_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_projects" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "documentId" TEXT,
    "title" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "institution" TEXT,
    "department" TEXT,
    "program" TEXT,
    "academicLevel" TEXT,
    "studentName" TEXT,
    "registrationNumber" TEXT,
    "supervisorName" TEXT,
    "academicYear" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "formattingProfileId" TEXT,
    "citationStyle" TEXT NOT NULL DEFAULT 'APA',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_chapters" (
    "id" TEXT NOT NULL,
    "academicProjectId" TEXT NOT NULL,
    "documentSectionId" TEXT,
    "chapterNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "wordTarget" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isFrontMatter" BOOLEAN NOT NULL DEFAULT false,
    "isAppendix" BOOLEAN NOT NULL DEFAULT false,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_requirements" (
    "id" TEXT NOT NULL,
    "academicProjectId" TEXT NOT NULL,
    "chapterId" TEXT,
    "category" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "parameters" TEXT NOT NULL DEFAULT '{}',
    "severity" TEXT NOT NULL DEFAULT 'ERROR',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_objectives" (
    "id" TEXT NOT NULL,
    "academicProjectId" TEXT NOT NULL,
    "objectiveType" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objective_questions" (
    "id" TEXT NOT NULL,
    "academicProjectId" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "researchQuestionId" TEXT,
    "questionnaireItemId" TEXT,
    "customQuestion" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "objective_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_hypotheses" (
    "id" TEXT NOT NULL,
    "academicProjectId" TEXT NOT NULL,
    "hypothesisType" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "variableIds" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'UNTESTED',
    "testedByAnalysisId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_hypotheses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_variables" (
    "id" TEXT NOT NULL,
    "academicProjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "description" TEXT,
    "variableType" TEXT,
    "role" TEXT NOT NULL,
    "measurementScale" TEXT,
    "operationalDefinition" TEXT,
    "datasetColumnId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conceptual_frameworks" (
    "id" TEXT NOT NULL,
    "academicProjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conceptual_frameworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conceptual_framework_nodes" (
    "id" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "variableId" TEXT,
    "concept" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conceptual_framework_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conceptual_framework_edges" (
    "id" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conceptual_framework_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "methodologies" (
    "id" TEXT NOT NULL,
    "academicProjectId" TEXT NOT NULL,
    "chapterId" TEXT,
    "design" TEXT,
    "population" TEXT,
    "sampleSize" INTEGER,
    "samplingTechnique" TEXT,
    "dataCollectionMethod" TEXT,
    "analysisPlan" TEXT,
    "ethicalConsiderations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "methodologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "methodology_sections" (
    "id" TEXT NOT NULL,
    "methodologyId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "methodology_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_guides" (
    "id" TEXT NOT NULL,
    "academicProjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "participantInfo" TEXT,
    "consentNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_questions" (
    "id" TEXT NOT NULL,
    "interviewGuideId" TEXT NOT NULL,
    "section" TEXT,
    "questionText" TEXT NOT NULL,
    "probe" TEXT,
    "objectiveId" TEXT,
    "researchQuestionId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "academicProjectId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "statement" TEXT NOT NULL,
    "interpretation" TEXT,
    "analysisId" TEXT,
    "datasetId" TEXT,
    "tableId" TEXT,
    "chartId" TEXT,
    "researchQuestionId" TEXT,
    "objectiveId" TEXT,
    "hypothesisId" TEXT,
    "numericValue" DOUBLE PRECISION,
    "numericLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conclusions" (
    "id" TEXT NOT NULL,
    "academicProjectId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "objectiveId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conclusions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conclusion_findings" (
    "id" TEXT NOT NULL,
    "conclusionId" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conclusion_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "academicProjectId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "audience" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_findings" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_appendices" (
    "id" TEXT NOT NULL,
    "academicProjectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "appendixType" TEXT NOT NULL,
    "chapterId" TEXT,
    "questionnaireId" TEXT,
    "interviewGuideId" TEXT,
    "sourceId" TEXT,
    "datasetId" TEXT,
    "tableId" TEXT,
    "chartId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_appendices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "front_matter" (
    "id" TEXT NOT NULL,
    "academicProjectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "front_matter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_abstracts" (
    "id" TEXT NOT NULL,
    "academicProjectId" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "wordLimit" INTEGER NOT NULL DEFAULT 300,
    "generationStatus" TEXT NOT NULL DEFAULT 'NONE',
    "reviewStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_abstracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_tables_figures" (
    "id" TEXT NOT NULL,
    "academicProjectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "tableId" TEXT,
    "chartId" TEXT,
    "documentSectionId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_tables_figures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_references" (
    "id" TEXT NOT NULL,
    "academicProjectId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "citationId" TEXT,
    "style" TEXT NOT NULL DEFAULT 'APA',
    "authors" TEXT NOT NULL DEFAULT '[]',
    "year" TEXT,
    "title" TEXT,
    "source" TEXT,
    "volume" TEXT,
    "issue" TEXT,
    "pages" TEXT,
    "url" TEXT,
    "doi" TEXT,
    "raw" TEXT NOT NULL,
    "isComplete" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_runs" (
    "id" TEXT NOT NULL,
    "academicProjectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "passedCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_issues" (
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

    CONSTRAINT "validation_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaires" (
    "id" TEXT NOT NULL,
    "academicProjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_sections" (
    "id" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaire_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_items" (
    "id" TEXT NOT NULL,
    "questionnaireSectionId" TEXT NOT NULL,
    "variableId" TEXT,
    "questionNumber" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "responseOptions" TEXT NOT NULL DEFAULT '[]',
    "likertScale" TEXT NOT NULL DEFAULT '[]',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaire_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evidence_section_links_documentSectionId_idx" ON "evidence_section_links"("documentSectionId");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_section_links_evidenceId_documentSectionId_key" ON "evidence_section_links"("evidenceId", "documentSectionId");

-- CreateIndex
CREATE INDEX "academic_projects_projectId_idx" ON "academic_projects"("projectId");

-- CreateIndex
CREATE INDEX "academic_projects_documentId_idx" ON "academic_projects"("documentId");

-- CreateIndex
CREATE INDEX "academic_projects_projectType_idx" ON "academic_projects"("projectType");

-- CreateIndex
CREATE UNIQUE INDEX "academic_chapters_documentSectionId_key" ON "academic_chapters"("documentSectionId");

-- CreateIndex
CREATE INDEX "academic_chapters_academicProjectId_idx" ON "academic_chapters"("academicProjectId");

-- CreateIndex
CREATE INDEX "academic_chapters_documentSectionId_idx" ON "academic_chapters"("documentSectionId");

-- CreateIndex
CREATE UNIQUE INDEX "academic_chapters_academicProjectId_chapterNumber_key" ON "academic_chapters"("academicProjectId", "chapterNumber");

-- CreateIndex
CREATE INDEX "academic_requirements_academicProjectId_idx" ON "academic_requirements"("academicProjectId");

-- CreateIndex
CREATE INDEX "academic_requirements_category_idx" ON "academic_requirements"("category");

-- CreateIndex
CREATE INDEX "academic_objectives_academicProjectId_idx" ON "academic_objectives"("academicProjectId");

-- CreateIndex
CREATE INDEX "objective_questions_objectiveId_idx" ON "objective_questions"("objectiveId");

-- CreateIndex
CREATE INDEX "research_hypotheses_academicProjectId_idx" ON "research_hypotheses"("academicProjectId");

-- CreateIndex
CREATE INDEX "research_variables_academicProjectId_idx" ON "research_variables"("academicProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "research_variables_academicProjectId_name_key" ON "research_variables"("academicProjectId", "name");

-- CreateIndex
CREATE INDEX "conceptual_frameworks_academicProjectId_idx" ON "conceptual_frameworks"("academicProjectId");

-- CreateIndex
CREATE INDEX "conceptual_framework_nodes_frameworkId_idx" ON "conceptual_framework_nodes"("frameworkId");

-- CreateIndex
CREATE INDEX "conceptual_framework_edges_frameworkId_idx" ON "conceptual_framework_edges"("frameworkId");

-- CreateIndex
CREATE UNIQUE INDEX "conceptual_framework_edges_frameworkId_sourceNodeId_targetN_key" ON "conceptual_framework_edges"("frameworkId", "sourceNodeId", "targetNodeId", "relationship");

-- CreateIndex
CREATE UNIQUE INDEX "methodologies_chapterId_key" ON "methodologies"("chapterId");

-- CreateIndex
CREATE INDEX "methodologies_academicProjectId_idx" ON "methodologies"("academicProjectId");

-- CreateIndex
CREATE INDEX "methodology_sections_methodologyId_idx" ON "methodology_sections"("methodologyId");

-- CreateIndex
CREATE UNIQUE INDEX "methodology_sections_methodologyId_sectionKey_key" ON "methodology_sections"("methodologyId", "sectionKey");

-- CreateIndex
CREATE INDEX "interview_guides_academicProjectId_idx" ON "interview_guides"("academicProjectId");

-- CreateIndex
CREATE INDEX "interview_questions_interviewGuideId_idx" ON "interview_questions"("interviewGuideId");

-- CreateIndex
CREATE INDEX "findings_academicProjectId_idx" ON "findings"("academicProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "findings_academicProjectId_number_key" ON "findings"("academicProjectId", "number");

-- CreateIndex
CREATE INDEX "conclusions_academicProjectId_idx" ON "conclusions"("academicProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "conclusion_findings_conclusionId_findingId_key" ON "conclusion_findings"("conclusionId", "findingId");

-- CreateIndex
CREATE INDEX "recommendations_academicProjectId_idx" ON "recommendations"("academicProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_findings_recommendationId_findingId_key" ON "recommendation_findings"("recommendationId", "findingId");

-- CreateIndex
CREATE INDEX "academic_appendices_academicProjectId_idx" ON "academic_appendices"("academicProjectId");

-- CreateIndex
CREATE INDEX "front_matter_academicProjectId_idx" ON "front_matter"("academicProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "front_matter_academicProjectId_kind_key" ON "front_matter"("academicProjectId", "kind");

-- CreateIndex
CREATE INDEX "academic_abstracts_academicProjectId_idx" ON "academic_abstracts"("academicProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "academic_tables_figures_documentSectionId_key" ON "academic_tables_figures"("documentSectionId");

-- CreateIndex
CREATE INDEX "academic_tables_figures_academicProjectId_idx" ON "academic_tables_figures"("academicProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "academic_tables_figures_academicProjectId_kind_number_key" ON "academic_tables_figures"("academicProjectId", "kind", "number");

-- CreateIndex
CREATE INDEX "academic_references_academicProjectId_idx" ON "academic_references"("academicProjectId");

-- CreateIndex
CREATE INDEX "academic_references_projectId_idx" ON "academic_references"("projectId");

-- CreateIndex
CREATE INDEX "validation_runs_academicProjectId_idx" ON "validation_runs"("academicProjectId");

-- CreateIndex
CREATE INDEX "validation_issues_validationRunId_idx" ON "validation_issues"("validationRunId");

-- CreateIndex
CREATE INDEX "validation_issues_resolved_idx" ON "validation_issues"("resolved");

-- CreateIndex
CREATE INDEX "questionnaires_academicProjectId_idx" ON "questionnaires"("academicProjectId");

-- CreateIndex
CREATE INDEX "questionnaire_sections_questionnaireId_idx" ON "questionnaire_sections"("questionnaireId");

-- CreateIndex
CREATE INDEX "questionnaire_items_variableId_idx" ON "questionnaire_items"("variableId");

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_items_questionnaireSectionId_questionNumber_key" ON "questionnaire_items"("questionnaireSectionId", "questionNumber");

-- AddForeignKey
ALTER TABLE "evidence_section_links" ADD CONSTRAINT "evidence_section_links_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "evidence_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_section_links" ADD CONSTRAINT "evidence_section_links_documentSectionId_fkey" FOREIGN KEY ("documentSectionId") REFERENCES "document_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_projects" ADD CONSTRAINT "academic_projects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_projects" ADD CONSTRAINT "academic_projects_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_projects" ADD CONSTRAINT "academic_projects_formattingProfileId_fkey" FOREIGN KEY ("formattingProfileId") REFERENCES "formatting_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_chapters" ADD CONSTRAINT "academic_chapters_academicProjectId_fkey" FOREIGN KEY ("academicProjectId") REFERENCES "academic_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_chapters" ADD CONSTRAINT "academic_chapters_documentSectionId_fkey" FOREIGN KEY ("documentSectionId") REFERENCES "document_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_requirements" ADD CONSTRAINT "academic_requirements_academicProjectId_fkey" FOREIGN KEY ("academicProjectId") REFERENCES "academic_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_requirements" ADD CONSTRAINT "academic_requirements_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "academic_chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_objectives" ADD CONSTRAINT "academic_objectives_academicProjectId_fkey" FOREIGN KEY ("academicProjectId") REFERENCES "academic_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_questions" ADD CONSTRAINT "objective_questions_academicProjectId_fkey" FOREIGN KEY ("academicProjectId") REFERENCES "academic_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_questions" ADD CONSTRAINT "objective_questions_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "academic_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_questions" ADD CONSTRAINT "objective_questions_researchQuestionId_fkey" FOREIGN KEY ("researchQuestionId") REFERENCES "research_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_questions" ADD CONSTRAINT "objective_questions_questionnaireItemId_fkey" FOREIGN KEY ("questionnaireItemId") REFERENCES "questionnaire_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_hypotheses" ADD CONSTRAINT "research_hypotheses_academicProjectId_fkey" FOREIGN KEY ("academicProjectId") REFERENCES "academic_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_variables" ADD CONSTRAINT "research_variables_academicProjectId_fkey" FOREIGN KEY ("academicProjectId") REFERENCES "academic_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_variables" ADD CONSTRAINT "research_variables_datasetColumnId_fkey" FOREIGN KEY ("datasetColumnId") REFERENCES "dataset_columns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conceptual_frameworks" ADD CONSTRAINT "conceptual_frameworks_academicProjectId_fkey" FOREIGN KEY ("academicProjectId") REFERENCES "academic_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conceptual_framework_nodes" ADD CONSTRAINT "conceptual_framework_nodes_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "conceptual_frameworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conceptual_framework_nodes" ADD CONSTRAINT "conceptual_framework_nodes_variableId_fkey" FOREIGN KEY ("variableId") REFERENCES "research_variables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conceptual_framework_edges" ADD CONSTRAINT "conceptual_framework_edges_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "conceptual_frameworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conceptual_framework_edges" ADD CONSTRAINT "conceptual_framework_edges_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "conceptual_framework_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conceptual_framework_edges" ADD CONSTRAINT "conceptual_framework_edges_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "conceptual_framework_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "methodologies" ADD CONSTRAINT "methodologies_academicProjectId_fkey" FOREIGN KEY ("academicProjectId") REFERENCES "academic_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "methodologies" ADD CONSTRAINT "methodologies_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "academic_chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "methodology_sections" ADD CONSTRAINT "methodology_sections_methodologyId_fkey" FOREIGN KEY ("methodologyId") REFERENCES "methodologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_guides" ADD CONSTRAINT "interview_guides_academicProjectId_fkey" FOREIGN KEY ("academicProjectId") REFERENCES "academic_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_interviewGuideId_fkey" FOREIGN KEY ("interviewGuideId") REFERENCES "interview_guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_academicProjectId_fkey" FOREIGN KEY ("academicProjectId") REFERENCES "academic_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "charts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_researchQuestionId_fkey" FOREIGN KEY ("researchQuestionId") REFERENCES "research_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "academic_objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_hypothesisId_fkey" FOREIGN KEY ("hypothesisId") REFERENCES "research_hypotheses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conclusions" ADD CONSTRAINT "conclusions_academicProjectId_fkey" FOREIGN KEY ("academicProjectId") REFERENCES "academic_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conclusions" ADD CONSTRAINT "conclusions_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "academic_objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conclusion_findings" ADD CONSTRAINT "conclusion_findings_conclusionId_fkey" FOREIGN KEY ("conclusionId") REFERENCES "conclusions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conclusion_findings" ADD CONSTRAINT "conclusion_findings_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_academicProjectId_fkey" FOREIGN KEY ("academicProjectId") REFERENCES "academic_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_findings" ADD CONSTRAINT "recommendation_findings_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_findings" ADD CONSTRAINT "recommendation_findings_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_appendices" ADD CONSTRAINT "academic_appendices_academicProjectId_fkey" FOREIGN KEY ("academicProjectId") REFERENCES "academic_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_appendices" ADD CONSTRAINT "academic_appendices_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "academic_chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_appendices" ADD CONSTRAINT "academic_appendices_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "questionnaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_appendices" ADD CONSTRAINT "academic_appendices_interviewGuideId_fkey" FOREIGN KEY ("interviewGuideId") REFERENCES "interview_guides"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_appendices" ADD CONSTRAINT "academic_appendices_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_appendices" ADD CONSTRAINT "academic_appendices_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_appendices" ADD CONSTRAINT "academic_appendices_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_appendices" ADD CONSTRAINT "academic_appendices_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "charts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "front_matter" ADD CONSTRAINT "front_matter_academicProjectId_fkey" FOREIGN KEY ("academicProjectId") REFERENCES "academic_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_abstracts" ADD CONSTRAINT "academic_abstracts_academicProjectId_fkey" FOREIGN KEY ("academicProjectId") REFERENCES "academic_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_tables_figures" ADD CONSTRAINT "academic_tables_figures_academicProjectId_fkey" FOREIGN KEY ("academicProjectId") REFERENCES "academic_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_tables_figures" ADD CONSTRAINT "academic_tables_figures_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_tables_figures" ADD CONSTRAINT "academic_tables_figures_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "charts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_tables_figures" ADD CONSTRAINT "academic_tables_figures_documentSectionId_fkey" FOREIGN KEY ("documentSectionId") REFERENCES "document_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_references" ADD CONSTRAINT "academic_references_academicProjectId_fkey" FOREIGN KEY ("academicProjectId") REFERENCES "academic_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_references" ADD CONSTRAINT "academic_references_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_references" ADD CONSTRAINT "academic_references_citationId_fkey" FOREIGN KEY ("citationId") REFERENCES "citations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_runs" ADD CONSTRAINT "validation_runs_academicProjectId_fkey" FOREIGN KEY ("academicProjectId") REFERENCES "academic_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_issues" ADD CONSTRAINT "validation_issues_validationRunId_fkey" FOREIGN KEY ("validationRunId") REFERENCES "validation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_academicProjectId_fkey" FOREIGN KEY ("academicProjectId") REFERENCES "academic_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_sections" ADD CONSTRAINT "questionnaire_sections_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "questionnaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_items" ADD CONSTRAINT "questionnaire_items_questionnaireSectionId_fkey" FOREIGN KEY ("questionnaireSectionId") REFERENCES "questionnaire_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_items" ADD CONSTRAINT "questionnaire_items_variableId_fkey" FOREIGN KEY ("variableId") REFERENCES "research_variables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

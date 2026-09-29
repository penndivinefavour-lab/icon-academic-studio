/*
  Warnings:

  - You are about to drop the column `examBoard` on the `syllabi` table. All the data in the column will be lost.
  - You are about to drop the column `subject` on the `syllabi` table. All the data in the column will be lost.
  - You are about to drop the column `topics` on the `syllabi` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `syllabi` table. All the data in the column will be lost.
  - You are about to drop the `questions` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `examBoardId` to the `syllabi` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subjectId` to the `syllabi` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `syllabi` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_projectId_fkey";

-- AlterTable
ALTER TABLE "syllabi" DROP COLUMN "examBoard",
DROP COLUMN "subject",
DROP COLUMN "topics",
DROP COLUMN "year",
ADD COLUMN     "examBoardId" TEXT NOT NULL,
ADD COLUMN     "metadata" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "session" TEXT,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "subjectId" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "version" TEXT;

-- DropTable
DROP TABLE "questions";

-- CreateTable
CREATE TABLE "exam_boards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "examBoardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "level" TEXT NOT NULL DEFAULT 'O_LEVEL',
    "description" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syllabus_sections" (
    "id" TEXT NOT NULL,
    "syllabusId" TEXT NOT NULL,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "code" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "syllabus_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syllabus_topics" (
    "id" TEXT NOT NULL,
    "syllabusId" TEXT NOT NULL,
    "sectionId" TEXT,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "code" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "syllabus_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "past_papers" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "examBoardId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "session" TEXT,
    "paperNumber" TEXT,
    "title" TEXT NOT NULL,
    "sourceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IMPORTED',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "past_papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "past_paper_questions" (
    "id" TEXT NOT NULL,
    "pastPaperId" TEXT NOT NULL,
    "questionNumber" TEXT NOT NULL DEFAULT '',
    "subQuestionNumber" TEXT,
    "text" TEXT NOT NULL,
    "marks" INTEGER NOT NULL DEFAULT 0,
    "questionType" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "commandVerb" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "section" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "past_paper_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_parts" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL,
    "marks" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marking_schemes" (
    "id" TEXT NOT NULL,
    "pastPaperId" TEXT NOT NULL,
    "sourceId" TEXT,
    "title" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marking_schemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marking_points" (
    "id" TEXT NOT NULL,
    "markingSchemeId" TEXT NOT NULL,
    "questionId" TEXT,
    "partLabel" TEXT,
    "pointText" TEXT NOT NULL,
    "marks" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marking_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_topic_mappings" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" TEXT NOT NULL DEFAULT 'SUGGESTED',
    "confidence" DOUBLE PRECISION,
    "rationale" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_topic_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_bank_items" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceQuestionId" TEXT,
    "questionText" TEXT NOT NULL,
    "marks" INTEGER NOT NULL DEFAULT 0,
    "topic" TEXT,
    "topicId" TEXT,
    "questionType" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "commandVerb" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "difficulty" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "year" INTEGER,
    "paperTitle" TEXT,
    "sourceId" TEXT,
    "notes" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_bank_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_exams" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "duration" INTEGER,
    "totalMarks" INTEGER NOT NULL DEFAULT 0,
    "configuration" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_exam_questions" (
    "id" TEXT NOT NULL,
    "mockExamId" TEXT NOT NULL,
    "sourceQuestionId" TEXT,
    "questionBankItemId" TEXT,
    "questionText" TEXT NOT NULL,
    "marks" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mock_exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_boards_name_key" ON "exam_boards"("name");

-- CreateIndex
CREATE INDEX "subjects_examBoardId_idx" ON "subjects"("examBoardId");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_examBoardId_code_key" ON "subjects"("examBoardId", "code");

-- CreateIndex
CREATE INDEX "syllabus_topics_syllabusId_idx" ON "syllabus_topics"("syllabusId");

-- CreateIndex
CREATE INDEX "syllabus_topics_sectionId_idx" ON "syllabus_topics"("sectionId");

-- CreateIndex
CREATE INDEX "syllabus_topics_parentId_idx" ON "syllabus_topics"("parentId");

-- CreateIndex
CREATE INDEX "past_papers_projectId_idx" ON "past_papers"("projectId");

-- CreateIndex
CREATE INDEX "past_papers_examBoardId_idx" ON "past_papers"("examBoardId");

-- CreateIndex
CREATE INDEX "past_papers_subjectId_idx" ON "past_papers"("subjectId");

-- CreateIndex
CREATE INDEX "past_papers_year_idx" ON "past_papers"("year");

-- CreateIndex
CREATE UNIQUE INDEX "past_papers_examBoardId_subjectId_year_paperNumber_key" ON "past_papers"("examBoardId", "subjectId", "year", "paperNumber");

-- CreateIndex
CREATE INDEX "past_paper_questions_pastPaperId_idx" ON "past_paper_questions"("pastPaperId");

-- CreateIndex
CREATE INDEX "past_paper_questions_questionNumber_idx" ON "past_paper_questions"("questionNumber");

-- CreateIndex
CREATE INDEX "question_parts_questionId_idx" ON "question_parts"("questionId");

-- CreateIndex
CREATE INDEX "marking_schemes_pastPaperId_idx" ON "marking_schemes"("pastPaperId");

-- CreateIndex
CREATE INDEX "marking_points_markingSchemeId_idx" ON "marking_points"("markingSchemeId");

-- CreateIndex
CREATE INDEX "marking_points_questionId_idx" ON "marking_points"("questionId");

-- CreateIndex
CREATE INDEX "question_topic_mappings_questionId_idx" ON "question_topic_mappings"("questionId");

-- CreateIndex
CREATE INDEX "question_topic_mappings_topicId_idx" ON "question_topic_mappings"("topicId");

-- CreateIndex
CREATE INDEX "question_topic_mappings_status_idx" ON "question_topic_mappings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "question_topic_mappings_questionId_topicId_key" ON "question_topic_mappings"("questionId", "topicId");

-- CreateIndex
CREATE INDEX "question_bank_items_projectId_idx" ON "question_bank_items"("projectId");

-- CreateIndex
CREATE INDEX "question_bank_items_topicId_idx" ON "question_bank_items"("topicId");

-- CreateIndex
CREATE INDEX "question_bank_items_questionType_idx" ON "question_bank_items"("questionType");

-- CreateIndex
CREATE INDEX "question_bank_items_commandVerb_idx" ON "question_bank_items"("commandVerb");

-- CreateIndex
CREATE INDEX "mock_exams_projectId_idx" ON "mock_exams"("projectId");

-- CreateIndex
CREATE INDEX "mock_exams_subjectId_idx" ON "mock_exams"("subjectId");

-- CreateIndex
CREATE INDEX "mock_exam_questions_mockExamId_idx" ON "mock_exam_questions"("mockExamId");

-- CreateIndex
CREATE INDEX "syllabi_examBoardId_idx" ON "syllabi"("examBoardId");

-- CreateIndex
CREATE INDEX "syllabi_projectId_idx" ON "syllabi"("projectId");

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_examBoardId_fkey" FOREIGN KEY ("examBoardId") REFERENCES "exam_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabi" ADD CONSTRAINT "syllabi_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabi" ADD CONSTRAINT "syllabi_examBoardId_fkey" FOREIGN KEY ("examBoardId") REFERENCES "exam_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabi" ADD CONSTRAINT "syllabi_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabi" ADD CONSTRAINT "syllabi_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabus_sections" ADD CONSTRAINT "syllabus_sections_syllabusId_fkey" FOREIGN KEY ("syllabusId") REFERENCES "syllabi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabus_sections" ADD CONSTRAINT "syllabus_sections_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "syllabus_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabus_topics" ADD CONSTRAINT "syllabus_topics_syllabusId_fkey" FOREIGN KEY ("syllabusId") REFERENCES "syllabi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabus_topics" ADD CONSTRAINT "syllabus_topics_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "syllabus_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabus_topics" ADD CONSTRAINT "syllabus_topics_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "syllabus_topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "past_papers" ADD CONSTRAINT "past_papers_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "past_papers" ADD CONSTRAINT "past_papers_examBoardId_fkey" FOREIGN KEY ("examBoardId") REFERENCES "exam_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "past_papers" ADD CONSTRAINT "past_papers_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "past_papers" ADD CONSTRAINT "past_papers_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "past_paper_questions" ADD CONSTRAINT "past_paper_questions_pastPaperId_fkey" FOREIGN KEY ("pastPaperId") REFERENCES "past_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_parts" ADD CONSTRAINT "question_parts_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "past_paper_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marking_schemes" ADD CONSTRAINT "marking_schemes_pastPaperId_fkey" FOREIGN KEY ("pastPaperId") REFERENCES "past_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marking_schemes" ADD CONSTRAINT "marking_schemes_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marking_points" ADD CONSTRAINT "marking_points_markingSchemeId_fkey" FOREIGN KEY ("markingSchemeId") REFERENCES "marking_schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marking_points" ADD CONSTRAINT "marking_points_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "past_paper_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_topic_mappings" ADD CONSTRAINT "question_topic_mappings_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "past_paper_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_topic_mappings" ADD CONSTRAINT "question_topic_mappings_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "syllabus_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank_items" ADD CONSTRAINT "question_bank_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank_items" ADD CONSTRAINT "question_bank_items_sourceQuestionId_fkey" FOREIGN KEY ("sourceQuestionId") REFERENCES "past_paper_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exams" ADD CONSTRAINT "mock_exams_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exams" ADD CONSTRAINT "mock_exams_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exam_questions" ADD CONSTRAINT "mock_exam_questions_mockExamId_fkey" FOREIGN KEY ("mockExamId") REFERENCES "mock_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exam_questions" ADD CONSTRAINT "mock_exam_questions_sourceQuestionId_fkey" FOREIGN KEY ("sourceQuestionId") REFERENCES "past_paper_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

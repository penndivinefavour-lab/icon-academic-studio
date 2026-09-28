import { prisma } from '@icon-academic/db';

export const TEMPLATE_SEEDS = [
  {
    name: 'Academic Research Report',
    description: 'Standard structure for academic research reports',
    type: 'RESEARCH_REPORT',
    projectType: 'RESEARCH_PROJECT',
    structure: JSON.stringify({
      sections: [
        { title: 'Abstract', headingLevel: 1, order: 1 },
        { title: 'Introduction', headingLevel: 1, order: 2 },
        { title: 'Literature Review', headingLevel: 1, order: 3 },
        { title: 'Methodology', headingLevel: 1, order: 4 },
        { title: 'Results', headingLevel: 1, order: 5 },
        { title: 'Discussion', headingLevel: 1, order: 6 },
        { title: 'Conclusion', headingLevel: 1, order: 7 },
        { title: 'References', headingLevel: 1, order: 8 },
      ],
    }),
    variables: JSON.stringify(['title', 'author', 'date']),
  },
  {
    name: 'HND Project',
    description: 'Structure for Higher National Diploma projects',
    type: 'HND_PROJECT',
    projectType: 'HND_PROJECT',
    structure: JSON.stringify({
      sections: [
        { title: 'Title Page', headingLevel: 1, order: 1 },
        { title: 'Acknowledgements', headingLevel: 1, order: 2 },
        { title: 'Abstract', headingLevel: 1, order: 3 },
        { title: 'Table of Contents', headingLevel: 1, order: 4 },
        { title: 'Chapter 1: Introduction', headingLevel: 1, order: 5 },
        { title: 'Chapter 2: Literature Review', headingLevel: 1, order: 6 },
        { title: 'Chapter 3: Methodology', headingLevel: 1, order: 7 },
        { title: 'Chapter 4: Implementation', headingLevel: 1, order: 8 },
        { title: 'Chapter 5: Results and Discussion', headingLevel: 1, order: 9 },
        { title: 'Chapter 6: Conclusion and Recommendations', headingLevel: 1, order: 10 },
        { title: 'References', headingLevel: 1, order: 11 },
        { title: 'Appendices', headingLevel: 1, order: 12 },
      ],
    }),
    variables: JSON.stringify(['title', 'studentName', 'registrationNumber', 'supervisor', 'date']),
  },
  {
    name: 'Thesis/Dissertation',
    description: 'Structure for thesis or dissertation documents',
    type: 'THESIS',
    projectType: 'THESIS',
    structure: JSON.stringify({
      sections: [
        { title: 'Title Page', headingLevel: 1, order: 1 },
        { title: 'Abstract', headingLevel: 1, order: 2 },
        { title: 'Dedication', headingLevel: 1, order: 3 },
        { title: 'Acknowledgements', headingLevel: 1, order: 4 },
        { title: 'Table of Contents', headingLevel: 1, order: 5 },
        { title: 'List of Figures', headingLevel: 1, order: 6 },
        { title: 'List of Tables', headingLevel: 1, order: 7 },
        { title: 'Chapter 1: Introduction', headingLevel: 1, order: 8 },
        { title: 'Chapter 2: Literature Review', headingLevel: 1, order: 9 },
        { title: 'Chapter 3: Research Methodology', headingLevel: 1, order: 10 },
        { title: 'Chapter 4: Results and Analysis', headingLevel: 1, order: 11 },
        { title: 'Chapter 5: Discussion', headingLevel: 1, order: 12 },
        { title: 'Chapter 6: Conclusion and Recommendations', headingLevel: 1, order: 13 },
        { title: 'References', headingLevel: 1, order: 14 },
        { title: 'Appendices', headingLevel: 1, order: 15 },
      ],
    }),
    variables: JSON.stringify(['title', 'author', 'degree', 'department', 'supervisor', 'date']),
  },
  {
    name: 'Study Guide/Pamphlet',
    description: 'Structure for GCE study guides and pamphlets',
    type: 'STUDY_GUIDE',
    projectType: 'GCE_STUDY_GUIDE',
    structure: JSON.stringify({
      sections: [
        { title: 'Cover Page', headingLevel: 1, order: 1 },
        { title: 'Introduction', headingLevel: 1, order: 2 },
        { title: 'Topic 1', headingLevel: 2, order: 3 },
        { title: 'Key Concepts', headingLevel: 3, order: 4 },
        { title: 'Worked Examples', headingLevel: 3, order: 5 },
        { title: 'Practice Questions', headingLevel: 2, order: 6 },
        { title: 'Answers', headingLevel: 2, order: 7 },
        { title: 'Topic 2', headingLevel: 2, order: 8 },
        { title: 'Summary', headingLevel: 1, order: 9 },
        { title: 'References', headingLevel: 1, order: 10 },
      ],
    }),
    variables: JSON.stringify(['subject', 'topic', 'examBoard', 'year']),
  },
  {
    name: 'Seminar Paper',
    description: 'Structure for seminar presentations and papers',
    type: 'SEMINAR_PAPER',
    projectType: 'SEMINAR_PAPER',
    structure: JSON.stringify({
      sections: [
        { title: 'Title', headingLevel: 1, order: 1 },
        { title: 'Author Information', headingLevel: 2, order: 2 },
        { title: 'Abstract', headingLevel: 1, order: 3 },
        { title: 'Introduction', headingLevel: 1, order: 4 },
        { title: 'Main Body', headingLevel: 1, order: 5 },
        { title: 'Conclusion', headingLevel: 1, order: 6 },
        { title: 'References', headingLevel: 1, order: 7 },
      ],
    }),
    variables: JSON.stringify(['title', 'author', 'date', 'venue']),
  },
  {
    name: 'Research Proposal',
    description: 'Structure for research proposals',
    type: 'PROPOSAL',
    projectType: 'RESEARCH_PROPOSAL',
    structure: JSON.stringify({
      sections: [
        { title: 'Title', headingLevel: 1, order: 1 },
        { title: 'Introduction', headingLevel: 1, order: 2 },
        { title: 'Problem Statement', headingLevel: 1, order: 3 },
        { title: 'Research Questions', headingLevel: 1, order: 4 },
        { title: 'Objectives', headingLevel: 1, order: 5 },
        { title: 'Literature Review', headingLevel: 1, order: 6 },
        { title: 'Methodology', headingLevel: 1, order: 7 },
        { title: 'Expected Outcomes', headingLevel: 1, order: 8 },
        { title: 'Timeline', headingLevel: 1, order: 9 },
        { title: 'Budget', headingLevel: 1, order: 10 },
        { title: 'References', headingLevel: 1, order: 11 },
      ],
    }),
    variables: JSON.stringify(['title', 'investigator', 'institution', 'duration']),
  },
  {
    name: 'Textbook Chapter',
    description: 'Structure for textbook chapters',
    type: 'CHAPTER',
    projectType: 'TEXTBOOK',
    structure: JSON.stringify({
      sections: [
        { title: 'Chapter Title', headingLevel: 1, order: 1 },
        { title: 'Learning Objectives', headingLevel: 2, order: 2 },
        { title: 'Introduction', headingLevel: 2, order: 3 },
        { title: 'Main Content', headingLevel: 2, order: 4 },
        { title: 'Summary', headingLevel: 2, order: 5 },
        { title: 'Exercises', headingLevel: 2, order: 6 },
        { title: 'Further Reading', headingLevel: 2, order: 7 },
        { title: 'References', headingLevel: 2, order: 8 },
      ],
    }),
    variables: JSON.stringify(['chapterTitle', 'chapterNumber', 'author']),
  },
];

export async function seedTemplates() {
  for (const template of TEMPLATE_SEEDS) {
    const existing = await prisma.template.findFirst({
      where: { name: template.name },
    });
    
    if (!existing) {
      await prisma.template.create({ data: template });
      console.log(`Seeded template: ${template.name}`);
    }
  }
}

export async function getTemplates(projectType?: string) {
  const where: any = {};
  if (projectType) {
    where.projectType = projectType;
  }
  return prisma.template.findMany({ where, orderBy: { createdAt: 'asc' } });
}

export async function getTemplate(id: string) {
  return prisma.template.findUnique({ where: { id } });
}

export async function createDocumentFromTemplate(templateId: string, projectId: string, title: string) {
  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template) {
    throw new Error('Template not found');
  }

  const structure = JSON.parse(template.structure || '{}');
  const document = await prisma.document.create({
    data: {
      projectId,
      title,
      type: template.type,
      status: 'DRAFT',
    },
  });

  // Create sections from template
  if (structure.sections) {
    for (const section of structure.sections) {
      await prisma.documentSection.create({
        data: {
          documentId: document.id,
          title: section.title,
          headingLevel: section.headingLevel,
          order: section.order,
        },
      });
    }
  }

  return document;
}

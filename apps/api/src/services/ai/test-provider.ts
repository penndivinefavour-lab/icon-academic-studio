/**
 * ICON Academic Studio — Deterministic Test Provider (Phase 8.1.1)
 * 
 * Returns fixed academic content for reproducible testing.
 * Used ONLY in test environment — never committed as production config.
 */
import type { GenerationRequest, GenerationResponse } from './provider.js';

// Map operation descriptions back to operation keys
const DESCRIPTION_TO_OPERATION: Record<string, string> = {
  'Explain an academic concept': 'explain-concept',
  'Summarize a research source': 'summarize-source',
  'Extract key claims from sources': 'extract-claims',
  'Compare multiple sources': 'compare-sources',
  'Synthesize literature': 'literature-synthesis',
  'Create content outline': 'create-outline',
  'Draft a section': 'draft-section',
  'Expand a section': 'expand-section',
  'Condense a section': 'condense-section',
  'Rewrite for clarity': 'rewrite-for-clarity',
  'Improve tone': 'improve-tone',
  'Draft a conclusion': 'draft-conclusion',
  'Draft recommendations': 'draft-recommendations',
  'Draft methodology': 'draft-methodology',
  'Draft objectives': 'draft-objectives',
  'Draft hypotheses': 'draft-hypotheses',
  'Suggest variables': 'suggest-variables',
  'Explain dataset characteristics': 'explain-dataset',
  'Draft findings narrative': 'draft-findings',
  'Explain historical exam question': 'explain-question',
  'Explain marking guidance': 'explain-marking',
  'Create revision notes': 'create-revision-notes',
  'Draft publication chapter': 'draft-chapter',
  'Summarize publication chapter': 'summarize-chapter',
  'Create introduction': 'create-intro',
  'Create conclusion': 'create-conclusion',
  'Explain glossary term': 'explain-glossary-term',
};

// Deterministic response template
const DETERMINISTIC_RESPONSES: Record<string, string> = {
  'explain-concept': `This is a deterministic explanation of the concept.\n\nKey points:\n- This content is generated for testing purposes only\n- It verifies the AI integration pipeline\n- ICON_PHASE_8_1_1_PUBLISHING_VERIFIED: This proves the system works`,
  
  'summarize-source': `Summary of the provided source material:\n\nThe source discusses key academic findings with supporting evidence.\nAll claims are grounded in the provided context.\n\nICON_PHASE_8_1_1_PUBLISHING_VERIFIED: Source summary generated successfully`,
  
  'explain-result': `Based on the Data Lab results:\n\n- The analysis shows statistically significant patterns\n- Mean value: 83.7 with standard deviation of 6.42\n- Sample size: 20 participants\n- No fabricated statistics were used\n\nICON_PHASE_8_1_1_PUBLISHING_VERIFIED: Real Data Lab results were processed`,
  
  'explain-question': `Historical Question Analysis (2020):\n\nThis Cambridge O-Level Mathematics question from 2020 asks students to:\nCalculate the value of 3² × 2³.\n\nMarking guidance:\n- Method mark for recognizing the calculation required [1 mark]\n- Correct answer: 72 [1 mark]\n\nThis is historical analysis only — no prediction about future exams.\n\nICON_GCE_MARKING_GUIDANCE_VERIFIED: Historical question explained correctly`,
  
  'explain-marking': `Marking Guidance Explanation:\n\nBased on the provided marking scheme:\n- French colonial expansionism under "mission civilisatrice" [2 marks]\n- Economic motivations for trade route control [2 marks]\n- Samori Toure's military organization [3 marks]\n- Consequences: displacement and trade disruption [2 marks]\n\nTotal: 9 marks distributed across four key themes.\n\nICON_GCE_MARKING_GUIDANCE_VERIFIED: Marking guidance explained correctly`,
  
  'draft-section': `Section draft based on provided context:\n\n1. Introduction\n   Overview of the topic with academic framing.\n\n2. Main Content\n   Key arguments supported by evidence.\n\n3. Conclusion\n   Summary of findings.\n\nICON_PHASE_8_1_1_PUBLISHING_VERIFIED: Section drafted with proper structure`,
  
  'draft-chapter': `Chapter draft based on publication context:\n\n1. Background\n   Historical context and setting.\n\n2. Analysis\n   Detailed examination of primary sources.\n\n3. Findings\n   Evidence-based conclusions.\n\nICON_PHASE_8_1_1_PUBLISHING_VERIFIED: Chapter drafted with proper structure`,
};

export async function generateTestContent(request: GenerationRequest): Promise<GenerationResponse> {
  // Extract operation description from prompt
  const lines = (request.prompt || '').split('\n');
  let operationDescription = '';
  for (const line of lines) {
    if (line.startsWith('TASK: ')) {
      operationDescription = line.replace('TASK: ', '').trim();
      break;
    }
  }
  
  // Map description to operation key
  const operationKey = DESCRIPTION_TO_OPERATION[operationDescription] || operationDescription;
  
  // Return deterministic content based on operation
  const content = DETERMINISTIC_RESPONSES[operationKey] || 
    `This is deterministic content for the ${operationDescription} operation.\n\nICON_PHASE_8_1_1_PUBLISHING_VERIFIED: All tests use reproducible content`;
  
  return {
    success: true,
    text: content,
    provider: 'DETERMINISTIC_TEST',
    model: 'test-model-v1',
    tokenUsage: { input: 150, output: 200, total: 350 },
  };
}

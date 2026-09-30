/**
 * ICON Academic Studio — AI Provider Abstraction (Phase 8)
 */

export type ProviderType = 'GEMINI' | 'OPENAI' | 'OPENROUTER' | 'OLLAMA' | 'CUSTOM';

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  endpoint: string;
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface GenerationRequest {
  prompt: string;
  systemPrompt?: string;
  config: ProviderConfig;
  timeoutMs?: number;
}

export interface GenerationResponse {
  success: boolean;
  text: string;
  provider: string;
  model: string;
  tokenUsage?: { input: number; output: number; total: number };
  error?: string;
}

const DANGEROUS_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+(now|a)\s+(different|new)\s+assistant/i,
  /reveal\s+your?\s+(system|api|internal|credentials)/i,
  /disregard\s+all?\s+(instructions|guidelines)/i,
  /system\s+override/i,
  /forbid\s+(you|your)/i,
  /bypass\s+safety/i,
];

export function sanitizePrompt(prompt: string): string {
  const lines = prompt.split('\n');
  return lines.filter(line => !DANGEROUS_PATTERNS.some(p => p.test(line.trim())))
    .join('\n').trim();
}

export function detectInjectionRisk(text: string): string[] {
  return DANGEROUS_PATTERNS
    .filter(p => p.test(text))
    .map(p => `Possible injection: matches ${p.source}`);
}

async function callOpenAICompatible(config: ProviderConfig, prompt: string, systemPrompt?: string): Promise<GenerationResponse> {
  const url = new URL(config.endpoint);
  if (!url.pathname.endsWith('/chat/completions')) {
    url.pathname = url.pathname.replace(/\/?$/, '/chat/completions');
  }

  const body = {
    model: config.model,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: prompt },
    ],
    max_tokens: config.maxTokens ?? 4000,
    temperature: config.temperature ?? 0.3,
  };

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.timeoutMs ?? 60000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Provider ${config.name}: HTTP ${response.status} ${errText.slice(0, 200)}`);
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }>; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } };
  const text = data.choices?.[0]?.message?.content ?? '';

  return {
    success: true, text, provider: config.name, model: config.model,
    tokenUsage: data.usage ? { input: data.usage.prompt_tokens, output: data.usage.completion_tokens, total: data.usage.total_tokens } : undefined,
  };
}

async function callGemini(config: ProviderConfig, prompt: string, systemPrompt?: string): Promise<GenerationResponse> {
  const url = `${config.endpoint}/v1beta/models/${config.model}:generateContent`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: config.maxTokens ?? 4000, temperature: config.temperature ?? 0.3 },
    systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
  };

  const response = await fetch(`${url}?key=${config.apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.timeoutMs ?? 60000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini: HTTP ${response.status} ${errText.slice(0, 200)}`);
  }

  const data = await response.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return { success: true, text, provider: config.name, model: config.model };
}

async function callOllama(config: ProviderConfig, prompt: string, systemPrompt?: string): Promise<GenerationResponse> {
  const url = config.endpoint.replace(/\/?$/, '') + '/api/generate';
  const body = { model: config.model, prompt, system: systemPrompt, options: { num_predict: config.maxTokens ?? 4000, temperature: config.temperature ?? 0.3 } };

  const response = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.timeoutMs ?? 120000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Ollama: HTTP ${response.status} ${errText.slice(0, 200)}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Ollama: no response body');

  let fullText = '';
  let done = false;
  while (!done) {
    const { value, done: streamDone } = await reader.read();
    done = streamDone;
    if (value) {
      const chunk = new TextDecoder().decode(value);
      for (const line of chunk.split('\n')) {
        if (!line.trim()) continue;
        try { const json = JSON.parse(line); if (json.response) fullText += json.response; } catch {}
      }
    }
  }
  return { success: true, text: fullText, provider: config.name, model: config.model };
}

export async function generateText(req: GenerationRequest): Promise<GenerationResponse> {
  const { config, prompt, systemPrompt } = req;
  switch (config.type) {
    case 'GEMINI': return callGemini(config, prompt, systemPrompt);
    case 'OLLAMA': return callOllama(config, prompt, systemPrompt);
    default: return callOpenAICompatible(config, prompt, systemPrompt);
  }
}

import { prisma } from '@icon-academic/db';

export async function listAvailableProviders(): Promise<Array<{ id: string; name: string; type: string; isActive: boolean; hasKey: boolean }>> {
  const providers = await prisma.aIProvider.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, type: true, isActive: true } });
  return Promise.all(providers.map(async p => ({ ...p, hasKey: (await prisma.aPIKey.count({ where: { providerId: p.id } })) > 0 })));
}

export async function getActiveProvider(): Promise<{ id: string; name: string; type: string; model: string; endpoint: string } | null> {
  const provider = await prisma.aIProvider.findFirst({ where: { isActive: true }, include: { models_list: { orderBy: { isDefault: 'desc' }, take: 1 } } });
  if (!provider || !provider.models_list.length) return null;
  return { id: provider.id, name: provider.name, type: provider.type, model: provider.models_list[0].identifier, endpoint: provider.endpoint };
}

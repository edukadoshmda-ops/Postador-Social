import { db } from './db';

function normalize(text: string): string {
  return text.toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/#\w+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(text: string): Set<string> {
  const n = normalize(text);
  if (!n) return new Set();
  return new Set(n.split(' ').filter(Boolean));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function expandSpintaxSample(text: string): string {
  try {
    const { parseSpintax } = require('./spintax');
    return parseSpintax(text);
  } catch { return text; }
}

export interface DuplicateHit {
  campaignId: string;
  campaignName: string;
  similarity: number;
  preview: string;
}

export function findDuplicates(newText: string, threshold: number = 0.85, expandSpintax: boolean = true): DuplicateHit[] {
  const store: any = (db as any).getStore ? (db as any).getStore() : { campaigns: [] };
  const campaigns: any[] = store.campaigns || [];
  const baseSample = expandSpintax ? expandSpintaxSample(newText) : newText;
  const baseTokens = tokens(baseSample);
  const hits: DuplicateHit[] = [];
  for (const c of campaigns) {
    if (!c.content_text) continue;
    const otherSample = expandSpintax ? expandSpintaxSample(c.content_text) : c.content_text;
    const otherTokens = tokens(otherSample);
    const sim = jaccard(baseTokens, otherTokens);
    if (sim >= threshold) {
      hits.push({ campaignId: c.id, campaignName: c.name, similarity: Math.round(sim * 100) / 100, preview: otherSample.slice(0, 120) });
    }
  }
  return hits.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
}

export function isDuplicate(newText: string, threshold: number = 0.85): boolean {
  return findDuplicates(newText, threshold).length > 0;
}

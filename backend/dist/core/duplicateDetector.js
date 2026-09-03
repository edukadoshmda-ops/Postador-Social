"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findDuplicates = findDuplicates;
exports.isDuplicate = isDuplicate;
const db_1 = require("./db");
function normalize(text) {
    return text.toLowerCase()
        .replace(/https?:\/\/\S+/g, ' ')
        .replace(/#\w+/g, ' ')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function tokens(text) {
    const n = normalize(text);
    if (!n)
        return new Set();
    return new Set(n.split(' ').filter(Boolean));
}
function jaccard(a, b) {
    if (a.size === 0 && b.size === 0)
        return 1;
    let inter = 0;
    for (const t of a)
        if (b.has(t))
            inter++;
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : inter / union;
}
function expandSpintaxSample(text) {
    try {
        const { parseSpintax } = require('./spintax');
        return parseSpintax(text);
    }
    catch {
        return text;
    }
}
function findDuplicates(newText, threshold = 0.85, expandSpintax = true) {
    const store = db_1.db.getStore ? db_1.db.getStore() : { campaigns: [] };
    const campaigns = store.campaigns || [];
    const baseSample = expandSpintax ? expandSpintaxSample(newText) : newText;
    const baseTokens = tokens(baseSample);
    const hits = [];
    for (const c of campaigns) {
        if (!c.content_text)
            continue;
        const otherSample = expandSpintax ? expandSpintaxSample(c.content_text) : c.content_text;
        const otherTokens = tokens(otherSample);
        const sim = jaccard(baseTokens, otherTokens);
        if (sim >= threshold) {
            hits.push({ campaignId: c.id, campaignName: c.name, similarity: Math.round(sim * 100) / 100, preview: otherSample.slice(0, 120) });
        }
    }
    return hits.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
}
function isDuplicate(newText, threshold = 0.85) {
    return findDuplicates(newText, threshold).length > 0;
}

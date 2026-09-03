"use strict";
/**
 * Filtro anti-spam — evita banimento por conteúdo gatilho da Meta
 * Valida hashtags, links, caps, palavras proibidas e duplicados
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateContent = validateContent;
const BANNED_PHRASES = [
    'compre agora', 'ganhe dinheiro', 'dinheiro fácil', 'renda extra',
    'clique aqui', 'link na bio', 'promoção imperdível', 'ultimas vagas',
    'vagas limitadas', 'ganhe seguidores', 'compre seguidores',
];
const SUSPICIOUS_PATTERNS = [
    { re: /(.)\1{4,}/, msg: 'Caracteres repetidos (ex: !!!!!)', suggestion: 'Evite repetir o mesmo caractere 4x+' },
    { re: /(https?:\/\/[^\s]+.*){3,}/i, msg: '3+ links no mesmo texto', suggestion: 'Use no máximo 1 link por postagem' },
];
function validateContent(text, spintaxEnabled) {
    const warnings = [];
    const suggestions = [];
    let score = 0;
    const t = (text || '').trim();
    if (!t)
        return { ok: false, risk: 'alto', score: 100, warnings: ['Texto vazio'], suggestions: ['Escreva um texto com Spintax'] };
    // hashtags
    const hashCount = (t.match(/#/g) || []).length;
    if (hashCount > 5) {
        warnings.push(`Muitas hashtags (${hashCount}) — Meta marca como spam`);
        suggestions.push('Use no máximo 3-4 hashtags');
        score += 25;
    }
    else if (hashCount > 3) {
        warnings.push(`Hashtags em excesso (${hashCount})`);
        score += 10;
    }
    // links
    const linkCount = (t.match(/https?:\/\//gi) || []).length;
    if (linkCount > 1) {
        warnings.push(`Muitos links (${linkCount})`);
        suggestions.push('Use 1 link por post e varie o encurtador');
        score += 20;
    }
    // caps ratio
    const caps = (t.match(/[A-ZÁÂÃÉÊÍÓÔÕÚÇ]/g) || []).length;
    const letters = (t.match(/[A-Za-zÁ-ú]/g) || []).length || 1;
    if (caps / letters > 0.45 && t.length > 40) {
        warnings.push('Muito CAPS LOCK — parece spam');
        suggestions.push('Use Caps só em 1-2 palavras');
        score += 15;
    }
    // tamanho
    if (t.length < 30) {
        warnings.push('Texto muito curto — pode ser marcado como repetitivo');
        score += 5;
    }
    if (t.length > 900) {
        warnings.push('Texto muito longo (>900) — risco de corte no Facebook');
        score += 5;
    }
    // frases banidas
    const lower = t.toLowerCase();
    for (const phrase of BANNED_PHRASES) {
        if (lower.includes(phrase)) {
            warnings.push(`Frase gatilho detectada: "${phrase}"`);
            suggestions.push('Reescreva com Spintax variando essa frase');
            score += 18;
        }
    }
    for (const p of SUSPICIOUS_PATTERNS) {
        if (p.re.test(t)) {
            warnings.push(p.msg);
            suggestions.push(p.suggestion);
            score += 15;
        }
    }
    // spintax
    const spintaxBlocks = (t.match(/\{[^{}]+\}/g) || []).length;
    if (!spintaxEnabled || spintaxBlocks === 0) {
        warnings.push('Sem Spintax — todo post será idêntico');
        suggestions.push('Use {opção1|opção2} e aninhado {a|{b|c}} para variar');
        score += 20;
    }
    else {
        // estima variações
        let total = 1;
        const re = /\{([^{}]+)\}/g;
        let m;
        while ((m = re.exec(t)) !== null) {
            const opts = m[1].split('|').filter(Boolean).length || 1;
            total *= Math.max(1, opts);
            if (total > 9999)
                break;
        }
        if (total < 5) {
            warnings.push(`Poucas variações de Spintax (~${total})`);
            suggestions.push('Adicione mais opções para chegar a 20+ variações');
            score += 15;
        }
        else if (total < 15) {
            warnings.push(`Variações limitadas (~${total})`);
            score += 7;
        }
    }
    // duplicado de pontuação / emojis em excesso
    const emojiCount = (t.match(/[\u{1F300}-\u{1FAFF}]/u) || []).length;
    if (emojiCount > 8) {
        warnings.push(`Muitos emojis (${emojiCount})`);
        score += 10;
    }
    score = Math.min(100, score);
    const risk = score >= 45 ? 'alto' : score >= 20 ? 'medio' : 'baixo';
    return { ok: score < 45, risk, score, warnings, suggestions: [...new Set(suggestions)] };
}

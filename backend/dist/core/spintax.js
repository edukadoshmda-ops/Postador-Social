"use strict";
/**
 * Interpretador e Gerador de Variações Spintax
 * Suporta spintax simples e aninhado: {Opção 1|Opção 2|{Sub 1|Sub 2}}
 *
 * Exemplos suportados:
 * - {opção1|opção2}
 * - {opção1|{sub1|sub2}|opção3}
 * - {|texto inicial|texto final}
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSpintax = parseSpintax;
exports.generateSpintaxSamples = generateSpintaxSamples;
/**
 * Parse recursivo de spintax com suporte a aninhamento
 */
function parseSpintaxNode(text, depth = 0) {
    if (depth > 10)
        return { type: 'text', value: text }; // Proteção contra infinito
    // Procurar pelo próximo bloco de spintax { ... }
    const start = text.indexOf('{');
    if (start === -1)
        return { type: 'text', value: text };
    const end = text.lastIndexOf('}');
    if (end === -1)
        return { type: 'text', value: text };
    if (start > end)
        return { type: 'text', value: text };
    // Texto antes do {
    const before = text.substring(0, start);
    // Texto depois do }
    const after = text.substring(end + 1);
    // Conteúdo dentro de { }
    const inner = text.substring(start + 1, end);
    // Verificar se há spintax aninhado dentro
    if (inner.indexOf('{') !== -1) {
        // Tem aninhamento - parse recursivo do interior
        const innerNode = parseSpintaxNode(inner, depth + 1);
        const beforeNode = parseSpintaxNode(before, depth);
        const afterNode = parseSpintaxNode(after, depth);
        // O node interior pode ser uma choice com children
        const choices = [];
        if (innerNode.type === 'choice' && innerNode.children) {
            choices.push(...innerNode.children);
        }
        else if (innerNode.type === 'text') {
            choices.push(innerNode);
        }
        return {
            type: 'choice',
            children: choices.length > 0 ? choices : [innerNode],
        };
    }
    // Spintax simples: {opção1|opção2|opção3}
    const options = inner.split('|').map(opt => opt.trim()).filter(opt => opt.length > 0);
    if (options.length === 1) {
        // Só uma opção, retornar o conteúdo combinado
        return {
            type: 'text',
            value: before + options[0] + after,
        };
    }
    // Múltiplas opções - criar choices para cada uma com before+opção+after
    const choices = options.map(opt => ({
        type: 'text',
        value: before + opt + after,
    }));
    return {
        type: 'choice',
        children: choices,
    };
}
/**
 * Expande um nó spintax para texto final, escolhendo aleatoriamente
 */
function expandNode(node) {
    if (node.type === 'text') {
        return node.value || '';
    }
    if (node.type === 'choice' && node.children && node.children.length > 0) {
        const randomIndex = Math.floor(Math.random() * node.children.length);
        return expandNode(node.children[randomIndex]);
    }
    return String(node.value || '');
}
/**
 * Interpreta texto spintax, retornando uma variação aleatória
 */
function parseSpintax(text) {
    if (!text)
        return '';
    const root = parseSpintaxNode(text);
    return expandNode(root);
}
/**
 * Gera amostras variadas de spintax para pré-visualização no frontend
 * @param text - Texto com spintax
 * @param count - Número de amostras diferentes para gerar
 */
function generateSpintaxSamples(text, count = 5) {
    const samples = new Set();
    let attempts = 0;
    while (samples.size < count && attempts < count * 20) {
        samples.add(parseSpintax(text));
        attempts++;
    }
    return Array.from(samples);
}

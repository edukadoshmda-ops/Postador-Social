/**
 * Variação automática de hashtags e links — quebra padrão de duplicidade
 * Chamado após parseSpintax, antes de publicar
 */

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Embaralha hashtags e, com 25% de chance, remove 1 hashtag para variar contagem
 * Preserva posição relativa dos demais tokens
 */
export function varyHashtags(text: string): string {
  const hashtagRe = /#[\w\u00C0-\u024F]+/gu;
  const hashtags = text.match(hashtagRe);
  if (!hashtags || hashtags.length < 2) return text;

  let varied = shuffleArray(hashtags);
  // 25% chance de dropar 1 hashtag (se tiver 3+)
  if (varied.length >= 3 && Math.random() < 0.25) {
    varied = varied.slice(0, varied.length - 1);
  }
  // 30% chance de variar caixa de 1 hashtag (#Tag vs #tag)
  if (Math.random() < 0.3) {
    const idx = Math.floor(Math.random() * varied.length);
    varied[idx] = Math.random() < 0.5 ? varied[idx].toLowerCase() : varied[idx].charAt(0).toUpperCase() + varied[idx].slice(1).toLowerCase();
  }

  let i = 0;
  return text.replace(hashtagRe, () => varied[i++] || '');
}

/**
 * Varia links: adiciona utm aleatório ou troca encurtador
 * Se houver múltiplos links no texto, embaralha ordem também
 */
export function varyLinks(text: string): string {
  const urlRe = /https?:\/\/[^\s]+/gi;
  const urls = text.match(urlRe);
  if (!urls || urls.length === 0) return text;

  const varied = urls.map((u) => {
    // 20% chance de adicionar UTM variado
    if (Math.random() < 0.2 && !u.includes('utm_')) {
      const sep = u.includes('?') ? '&' : '?';
      const utm = `utm_source=${['fb','ig','grp','social'][Math.floor(Math.random()*4)]}&utm_campaign=${Math.floor(1000 + Math.random()*9000)}`;
      return u + sep + utm;
    }
    return u;
  });

  // se 2+ links, embaralha 30% das vezes
  const finalUrls = urls.length >= 2 && Math.random() < 0.3 ? shuffleArray(varied) : varied;

  let i = 0;
  return text.replace(urlRe, () => finalUrls[i++] || '');
}

export function varyHashtagsAndLinks(text: string): string {
  let out = varyHashtags(text);
  out = varyLinks(out);
  // 10% chance de inserir/remover emoji leve para quebrar fingerprint
  if (Math.random() < 0.1) {
    const emojis = ['✨', '🔥', '👉', '✅', '💬'];
    if (!/[✨🔥👉✅💬]/.test(out) && Math.random() < 0.5) {
      const e = emojis[Math.floor(Math.random()*emojis.length)];
      out = out + ' ' + e;
    }
  }
  return out;
}

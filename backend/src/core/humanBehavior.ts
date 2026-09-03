/**
 * Comportamento humano — simula pausas, scroll, digitação e interações leves
 * Quebra padrões robóticos detectáveis pela Meta
 */

export function typingDelayMs(text: string): number {
  const base = Math.min(2500, text.length * 18); // ~18ms por caractere
  const jitter = Math.floor(Math.random() * 600) - 300;
  return Math.max(700, base + jitter);
}

export function scrollDurationMs(): number {
  // scroll natural 1-3s
  return Math.floor(Math.random() * 2000) + 1000;
}

export function microPauseMs(): number {
  // pausa curta entre ações 400-1500ms
  return Math.floor(Math.random() * 1100) + 400;
}

export function shouldDoRandomEngagement(): boolean {
  // 12% de chance de fazer like/scroll extra antes do post
  return Math.random() < 0.12;
}

export function randomEngagementActions(): string[] {
  const pool = ['FEED_SCROLL', 'LIKE', 'STORY_VIEW'];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.floor(Math.random() * 2) + 1);
}

export function humanJitterSeconds(): number {
  // jitter extra 5-25s
  return Math.floor(Math.random() * 20) + 5;
}

export function naturalPauseAfterMany(postIndex: number): number {
  // a cada N posts, já existe getLongPauseDuration, aqui só adiciona jitter extra
  return 0;
}

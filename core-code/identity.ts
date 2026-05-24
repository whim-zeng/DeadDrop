const ADJECTIVES = [
  '孤独的', '深夜的', '湖边的', '街角的', '雨后的',
  '午后的', '迷路的', '等待的', '沉默的', '流浪的',
  '安静的', '忙碌的', '疲惫的', '清醒的', '失眠的',
  '微笑的', '仰望的', '低语的', '追逐的', '守望的',
];

const NOUNS = [
  '美食家', '失眠者', '守望者', '旅行者', '梦想家',
  '路人甲', '咖啡师', '读者', '写作者', '听风者',
  '追光者', '拾荒者', '造梦者', '过客', '归人',
  '观察者', '漫步者', '思考者', '记录者', '探索者',
];

export function generateAnonymousCode(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${adj}${noun}_${num}`;
}

export function getGradientColors(gradientName: string): string[] {
  const preset = [
    { name: 'blue', colors: ['#3b82f6', '#1d4ed8'] },
    { name: 'rose', colors: ['#f43f5e', '#be123c'] },
    { name: 'emerald', colors: ['#10b981', '#047857'] },
    { name: 'amber', colors: ['#f59e0b', '#b45309'] },
    { name: 'violet', colors: ['#8b5cf6', '#5b21b6'] },
    { name: 'cyan', colors: ['#06b6d4', '#0e7490'] },
    { name: 'orange', colors: ['#f97316', '#c2410c'] },
    { name: 'slate', colors: ['#64748b', '#1e293b'] },
  ];
  return preset.find((p) => p.name === gradientName)?.colors || preset[0].colors;
}

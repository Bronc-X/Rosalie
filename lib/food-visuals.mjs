export const FOOD_VISUAL_CATEGORIES = Object.freeze({
  '甜品小食': { kind: 'sweet', tone: '#a84f3a' },
  '生腌': { kind: 'raw', tone: '#315f5a' },
  '肠粉': { kind: 'rice-roll', tone: '#8d6841' },
  '牛肉火锅': { kind: 'hotpot', tone: '#a43b2f' },
  '粿条面': { kind: 'noodles', tone: '#426b5d' },
  '白粥大排档': { kind: 'congee', tone: '#765c40' },
  '小炒': { kind: 'wok', tone: '#91452f' },
  '私房菜': { kind: 'private', tone: '#645247' },
  '异国料理': { kind: 'global', tone: '#4e6672' },
  '早茶': { kind: 'dimsum', tone: '#ad633e' },
  '烧腊简餐': { kind: 'roast', tone: '#762f2b' },
  '截图补充': { kind: 'archive', tone: '#536850' },
});

const fallbackVisual = Object.freeze({ kind: 'market', tone: '#465e54' });

export function getFoodVisual(category, index = 0) {
  const visual = FOOD_VISUAL_CATEGORIES[category] ?? fallbackVisual;
  const numericIndex = Number(index);
  const safeIndex = Number.isFinite(numericIndex) ? Math.abs(Math.trunc(numericIndex)) : 0;
  return { ...visual, variant: safeIndex % 4 };
}

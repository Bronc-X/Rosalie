export const VISUAL_MOTIFS = Object.freeze([
  { id: 'sakura', label: '樱花', shape: 'five-petal', fill: '#f2a3bc', accent: '#ffd58b' },
  { id: 'potato', label: '土豆', shape: 'soft-pebble', fill: '#e7b46e', accent: '#fff0c8' },
  { id: 'star', label: '星星', shape: 'four-point-star', fill: '#f6c96f', accent: '#fff8db' },
  { id: 'heart', label: '小心心', shape: 'puffy-heart', fill: '#df88aa', accent: '#ffd4e3' },
  { id: 'moon', label: '弯月', shape: 'crescent', fill: '#9d9ee8', accent: '#e9e5ff' },
  { id: 'cloud', label: '云朵', shape: 'three-lobe-cloud', fill: '#a8c9e9', accent: '#f2fbff' },
  { id: 'bow', label: '蝴蝶结', shape: 'double-loop-bow', fill: '#d8a4d8', accent: '#fff0fa' },
  { id: 'leaf', label: '薄荷叶', shape: 'tilted-leaf', fill: '#8fcab0', accent: '#dcf7e9' },
  { id: 'sun', label: '小太阳', shape: 'soft-ray-sun', fill: '#f2b36f', accent: '#fff1b9' },
  { id: 'pearl', label: '糖珠', shape: 'glass-pearl', fill: '#9fc2ef', accent: '#f3f8ff' },
]);

export function motifForIndex(index, seed = 0) {
  const safeIndex = Number.isFinite(index) ? Math.trunc(index) : 0;
  const safeSeed = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  const normalized = ((safeIndex + safeSeed) % VISUAL_MOTIFS.length + VISUAL_MOTIFS.length) % VISUAL_MOTIFS.length;
  return VISUAL_MOTIFS[normalized];
}

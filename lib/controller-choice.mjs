export const CONTROLLER_STORAGE_KEY = 'rosalie-controller';
export const CONTROLLER_PALETTE_STORAGE_KEY = 'rosalie-controller-palette';

export const CONTROLLER_CHOICES = Object.freeze([
  Object.freeze({ id: 'pull', label: '双潮生', asset: '/soft-pull-controller.webp' }),
  Object.freeze({ id: 'rosette', label: '不烫别怕', asset: '/match-rosette.webp' }),
  Object.freeze({ id: 'talisman', label: '铃儿响叮当', asset: '/match-charm.webp' }),
]);

export const CONTROLLER_PALETTES = Object.freeze([
  Object.freeze({ id: 'original', label: '本色', filter: 'none', colors: ['#efd39d', '#a9c6aa'] }),
  Object.freeze({ id: 'blush', label: '樱雾', filter: 'sepia(.18) saturate(1.45) hue-rotate(292deg) brightness(1.06)', colors: ['#f4a9c2', '#d978a2'] }),
  Object.freeze({ id: 'midnight', label: '月蓝', filter: 'sepia(.12) saturate(1.35) hue-rotate(156deg) brightness(.9)', colors: ['#9eaee8', '#6676b8'] }),
]);

export function resolveControllerChoice(value) {
  return CONTROLLER_CHOICES.some((choice) => choice.id === value) ? value : 'pull';
}

export function controllerAsset(value) {
  const resolved = resolveControllerChoice(value);
  return CONTROLLER_CHOICES.find((choice) => choice.id === resolved).asset;
}

export function resolveControllerPalette(value) {
  return CONTROLLER_PALETTES.some((palette) => palette.id === value) ? value : 'original';
}

export function controllerPaletteFilter(value) {
  const resolved = resolveControllerPalette(value);
  return CONTROLLER_PALETTES.find((palette) => palette.id === resolved).filter;
}

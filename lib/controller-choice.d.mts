export type ControllerChoiceId = 'pull' | 'rosette' | 'talisman';
export type ControllerChoice = Readonly<{ id: ControllerChoiceId; label: string; asset: string }>;
export type ControllerPaletteId = 'original' | 'blush' | 'midnight';
export type ControllerPalette = Readonly<{
  id: ControllerPaletteId;
  label: string;
  filter: string;
  colors: readonly [string, string];
}>;

export const CONTROLLER_STORAGE_KEY: string;
export const CONTROLLER_PALETTE_STORAGE_KEY: string;
export const CONTROLLER_CHOICES: readonly ControllerChoice[];
export const CONTROLLER_PALETTES: readonly ControllerPalette[];
export function resolveControllerChoice(value: unknown): ControllerChoiceId;
export function controllerAsset(value: unknown): string;
export function resolveControllerPalette(value: unknown): ControllerPaletteId;
export function controllerPaletteFilter(value: unknown): string;

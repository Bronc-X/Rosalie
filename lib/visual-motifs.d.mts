export type VisualMotif = {
  id: string;
  label: string;
  shape: string;
  fill: string;
  accent: string;
};
export const VISUAL_MOTIFS: readonly VisualMotif[];
export function motifForIndex(index: number, seed?: number): VisualMotif;

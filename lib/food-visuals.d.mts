export type FoodVisual = {
  kind: string;
  tone: `#${string}`;
  variant: number;
};

export const FOOD_VISUAL_CATEGORIES: Readonly<Record<string, Omit<FoodVisual, 'variant'>>>;
export function getFoodVisual(category: string, index?: number): FoodVisual;

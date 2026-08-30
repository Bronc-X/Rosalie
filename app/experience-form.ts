export const TAG_PRESETS = [
  '早餐',
  '小吃',
  '正餐',
  '夜宵',
  '甜品',
  '咖啡',
  '展览',
  '散步',
  '购物',
  '约会',
] as const;

export const CUSTOM_TAG_VALUE = '__custom__' as const;

export type TagSelection = '' | (typeof TAG_PRESETS)[number] | typeof CUSTOM_TAG_VALUE;

export function tagsFromSelection(selection: string, customTag: string): string[] {
  if (!selection) return [];
  const values = selection === CUSTOM_TAG_VALUE
    ? customTag.split(/[,，]/u)
    : [selection];
  return [...new Set(values.map((tag) => tag.trim()).filter(Boolean))];
}

export function tagSelectionFromTags(tags: readonly string[]): {
  selection: TagSelection;
  customTag: string;
} {
  if (tags.length === 0) return { selection: '', customTag: '' };
  if (tags.length === 1 && TAG_PRESETS.includes(tags[0] as (typeof TAG_PRESETS)[number])) {
    return { selection: tags[0] as (typeof TAG_PRESETS)[number], customTag: '' };
  }
  return { selection: CUSTOM_TAG_VALUE, customTag: tags.join('，') };
}

export type ReadableLinkPreview = {
  sourceUrl?: string | null;
  title?: string | null;
  address?: string | null;
  openingHours?: string | null;
  imageUrl?: string | null;
};

export function previewHasContent(preview: ReadableLinkPreview | null | undefined): boolean {
  if (!preview) return false;
  return [preview.title, preview.address, preview.openingHours, preview.imageUrl]
    .some((value) => typeof value === 'string' && value.trim().length > 0);
}

const EXPERIENCE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_EXPERIENCE_IMAGE_BYTES = 10 * 1024 * 1024;

export function validateExperienceImage(file: { type: string; size: number }):
  | { valid: true }
  | { valid: false; message: string } {
  if (!EXPERIENCE_IMAGE_TYPES.has(file.type.toLowerCase())) {
    return { valid: false, message: '只支持 JPEG、PNG、WebP 图片。' };
  }
  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    return { valid: false, message: '图片是空的，请重新拍一张。' };
  }
  if (file.size > MAX_EXPERIENCE_IMAGE_BYTES) {
    return { valid: false, message: '图片不能超过 10MB。' };
  }
  return { valid: true };
}

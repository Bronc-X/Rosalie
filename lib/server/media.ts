export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_MEDIA_PER_FOOTPRINT = 8;

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type UploadMetadata = {
  type: string;
  size: number;
};

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function matchesSignature(type: string, bytes: Uint8Array): boolean {
  if (type === 'image/jpeg') return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (type === 'image/png') return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (type === 'image/webp') {
    return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50]);
  }
  return false;
}

export function validateImageUpload(metadata: UploadMetadata, bytes: Uint8Array): void {
  const type = metadata.type.toLowerCase();
  if (!IMAGE_TYPES.has(type)) throw new TypeError('Unsupported image type; use JPEG, PNG, or WebP');
  if (!Number.isSafeInteger(metadata.size) || metadata.size <= 0) throw new TypeError('Image is empty');
  if (metadata.size > MAX_IMAGE_BYTES) throw new TypeError('Image must not exceed 10 MiB');
  if (!matchesSignature(type, bytes)) throw new TypeError('Image content does not match its declared signature');
}

export function extensionForImageType(type: string): 'jpg' | 'png' | 'webp' {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  throw new TypeError('Unsupported image type');
}

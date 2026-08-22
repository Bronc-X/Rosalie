// Next/Vercel build alias. Vinext replaces `cloudflare:workers` with the real
// runtime module, while Vercel uses the Blob persistence adapter instead.
export const env: Record<string, never> = {};

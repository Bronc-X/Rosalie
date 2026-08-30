// Next's Vercel compatibility build loads route modules while collecting metadata.
// The deployed Vinext Worker resolves the real `cloudflare:workers` module instead.
export const env: Cloudflare.Env = {};

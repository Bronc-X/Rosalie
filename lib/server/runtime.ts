import { env } from 'cloudflare:workers';
import type { AppBindings } from './api';

type CloudflareBindings = Cloudflare.Env & {
  DB?: D1Database;
  MEDIA?: R2Bucket;
  AUTH_PEPPER_V1?: string;
};

export function getBindings(): AppBindings {
  const bindings = env as CloudflareBindings;
  if (!bindings.DB || !bindings.MEDIA || !bindings.AUTH_PEPPER_V1) {
    throw new Error('DB, MEDIA, and AUTH_PEPPER_V1 bindings are required');
  }
  return {
    DB: bindings.DB,
    MEDIA: bindings.MEDIA,
    AUTH_PEPPER_V1: bindings.AUTH_PEPPER_V1,
  };
}

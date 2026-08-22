import { env } from 'cloudflare:workers';

import { SCHEMA_STATEMENTS } from '@/lib/site-schema.mjs';

type SiteEnvironment = { DB?: D1Database };

let initializedDatabase: D1Database | null = null;
let initialization: Promise<void> | null = null;

export function getSiteDatabase() {
  const database = (env as unknown as SiteEnvironment).DB;
  if (!database) throw new Error('D1 binding DB is not configured');
  return database;
}

export async function ensureSiteSchema(database = getSiteDatabase()) {
  if (initializedDatabase !== database) {
    initializedDatabase = database;
    initialization = null;
  }
  if (!initialization) {
    initialization = database
      .batch(SCHEMA_STATEMENTS.map((statement) => database.prepare(statement)))
      .then(() => undefined)
      .catch((error: unknown) => {
        initialization = null;
        throw error;
      });
  }
  await initialization;
  return database;
}

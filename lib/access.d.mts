export const ACCESS_COOKIE: string;
export const ACCESS_TTL_MS: number;
export function hashAccessPassword(password: unknown): Promise<string>;
export function matchesAccessPassword(password: unknown, expectedHash: unknown): Promise<boolean>;
export function createAccessToken(secret: string, now?: number, ttlMs?: number): Promise<string>;
export function verifyAccessToken(token: unknown, secret: unknown, now?: number): Promise<boolean>;
export function safeNextPath(value: unknown): string;


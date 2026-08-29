export type SiteTheme = 'light' | 'dark';
export type ShareMode = 'wechat-menu' | 'wechat-launch' | 'native-share' | 'copy';

export const PRIMARY_NAV: ReadonlyArray<{ href: string; label: string }>;
export const LATEST_RELEASE: Readonly<{
  date: '2026-08-29';
  label: '08.29';
  items: readonly ['汕头食路', '德州围桌', '抽象头像'];
}>;
export const THEME_STORAGE_KEY: 'rosalie-theme';
export function isPrimaryNavActive(pathname: string, href: string): boolean;
export function resolveTheme(storedTheme: string | null | undefined, prefersDark?: boolean): SiteTheme;
export function nextTheme(theme: SiteTheme): SiteTheme;
export function getShareMode(options?: { userAgent?: string; canNativeShare?: boolean }): ShareMode;

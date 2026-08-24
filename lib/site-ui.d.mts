export type SiteTheme = 'light' | 'dark';
export type ShareMode = 'wechat-menu' | 'wechat-launch' | 'native-share' | 'copy';

export const PRIMARY_NAV: ReadonlyArray<{ href: string; label: string }>;
export const LATEST_RELEASE: Readonly<{
  date: '2026-08-24';
  label: '08.24';
  items: readonly ['双主题', '微信入口', '四枚护符'];
}>;
export const THEME_STORAGE_KEY: 'rosalie-theme';
export function resolveTheme(storedTheme: string | null | undefined, prefersDark?: boolean): SiteTheme;
export function nextTheme(theme: SiteTheme): SiteTheme;
export function getShareMode(options?: { userAgent?: string; canNativeShare?: boolean }): ShareMode;

export const PRIMARY_NAV = Object.freeze([
  { href: '/', label: '首页' },
  { href: '/treehole', label: '留言' },
  { href: '/interview', label: '面试' },
  { href: '/schedule', label: '日历' },
  { href: '/food', label: '食路' },
  { href: '/play', label: '游戏' },
]);

export const LATEST_RELEASE = Object.freeze({
  date: '2026-08-29',
  label: '08.29',
  items: Object.freeze(['汕头食路', '德州围桌', '抽象头像']),
});

export const THEME_STORAGE_KEY = 'rosalie-theme';

export function isPrimaryNavActive(pathname, href) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function resolveTheme(storedTheme, prefersDark = false) {
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
  return prefersDark ? 'dark' : 'light';
}

export function nextTheme(theme) {
  return theme === 'dark' ? 'light' : 'dark';
}

export function getShareMode({ userAgent = '', canNativeShare = false } = {}) {
  if (/MicroMessenger/i.test(userAgent)) return 'wechat-menu';
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)) return 'wechat-launch';
  if (canNativeShare) return 'native-share';
  return 'copy';
}

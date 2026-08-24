export const PRIMARY_NAV = Object.freeze([
  { href: '/', label: '首页' },
  { href: '/treehole', label: '留言' },
  { href: '/schedule', label: '日历' },
  { href: '/play', label: '游戏' },
]);

export const LATEST_RELEASE = Object.freeze({
  date: '2026-08-24',
  label: '08.24',
  items: Object.freeze(['双主题', '微信入口', '四枚护符']),
});

export const THEME_STORAGE_KEY = 'rosalie-theme';

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

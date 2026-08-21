import type { Metadata } from 'next';

import { safeNextPath } from '@/lib/access.mjs';
import { UnlockForm } from './unlock-form';
import './unlock.css';

export const metadata: Metadata = {
  title: '健康度检测',
  description: '输入密码。',
  robots: { index: false, follow: false },
};

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <UnlockForm nextPath={safeNextPath(next)} />;
}

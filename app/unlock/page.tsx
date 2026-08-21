import type { Metadata } from 'next';

import { safeNextPath } from '@/lib/access.mjs';
import { UnlockForm } from './unlock-form';
import './unlock.css';

export const metadata: Metadata = {
  title: '暗号入口',
  description: '这段距离暂时上锁。',
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


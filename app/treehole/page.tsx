import type { Metadata } from 'next';

import { TreeholeBoard } from './treehole-board';
import './treehole.css';

export const metadata: Metadata = {
  title: '留言',
  description: '匿名留言。',
  robots: { index: false, follow: false },
};

export default function TreeholePage() {
  return <TreeholeBoard />;
}

import type { Metadata } from 'next';

import { TreeholeBoard } from './treehole-board';
import './treehole.css';

export const metadata: Metadata = {
  title: '树洞留言板',
  description: '不署名，也不催回复。',
  robots: { index: false, follow: false },
};

export default function TreeholePage() {
  return <TreeholeBoard />;
}


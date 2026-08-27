import type { Metadata } from 'next';

import { LinkMatchGame } from './link-match-game';
import './connect.css';

export const metadata: Metadata = {
  title: '四枚护符',
  description: '用最多两次转弯，把四种护符逐对连起来。',
  robots: { index: false, follow: false },
};

export default function ConnectGamePage() {
  return <LinkMatchGame />;
}

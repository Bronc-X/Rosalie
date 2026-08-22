import type { Metadata } from 'next';

import { ScheduleBoard } from './schedule-board';
import './schedule.css';

export const metadata: Metadata = {
  title: '共享日程板',
  description: '所有已解锁访客共同维护的日程。',
  robots: { index: false, follow: false },
};

export default function SchedulePage() {
  return <ScheduleBoard />;
}

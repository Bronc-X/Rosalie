import type { Metadata } from 'next';

import { ScheduleBoard } from './schedule-board';
import './schedule.css';

export const metadata: Metadata = {
  title: '日历',
  description: '共享日程。',
  robots: { index: false, follow: false },
};

export default function SchedulePage() {
  return <ScheduleBoard />;
}

import type { Metadata } from 'next';

import './interview.css';
import { InterviewRoom } from './interview-room';

export const metadata: Metadata = {
  title: '模拟面试',
  description: '科技公司岗位模拟面试。',
};

export default function InterviewPage() {
  return <InterviewRoom />;
}

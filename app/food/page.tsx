import type { Metadata } from 'next';

import FoodAtlas from './food-atlas';
import './food.css';

export const metadata: Metadata = {
  title: '汕头食路',
  description: '汕头 53 间店的地图和食后记。',
  alternates: { canonical: '/food' },
  robots: { index: false, follow: false },
};

export default function FoodPage() {
  return <FoodAtlas />;
}

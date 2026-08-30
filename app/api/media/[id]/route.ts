import { createDynamicRouteHandler } from '@/lib/server/route';

export const dynamic = 'force-dynamic';
export const GET = createDynamicRouteHandler('media');

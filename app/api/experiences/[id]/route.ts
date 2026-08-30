import { createDynamicRouteHandler } from '@/lib/server/route';

export const dynamic = 'force-dynamic';
export const GET = createDynamicRouteHandler('experience');
export const PATCH = createDynamicRouteHandler('experience');
export const DELETE = createDynamicRouteHandler('experience');

import { createDynamicRouteHandler } from '@/lib/server/route';

export const dynamic = 'force-dynamic';
export const GET = createDynamicRouteHandler('footprints');
export const POST = createDynamicRouteHandler('footprints');

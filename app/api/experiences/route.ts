import { createRouteHandler } from '@/lib/server/route';

export const dynamic = 'force-dynamic';
export const GET = createRouteHandler('experiences');
export const POST = createRouteHandler('experiences');

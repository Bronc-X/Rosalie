import { handleApiRequest, type ApiRoute } from './api';
import { getBindings } from './runtime';

export function createRouteHandler(route: ApiRoute) {
  return async function routeHandler(request: Request): Promise<Response> {
    return handleApiRequest(request, route, {}, getBindings());
  };
}

export function createDynamicRouteHandler(route: ApiRoute) {
  return async function dynamicRouteHandler(
    request: Request,
    context: { params: Promise<{ id: string }> },
  ): Promise<Response> {
    const { id } = await context.params;
    return handleApiRequest(request, route, { id }, getBindings());
  };
}

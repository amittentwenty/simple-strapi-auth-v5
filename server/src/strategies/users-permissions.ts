import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { getOAuthServer } from '../auth/server';

const { ForbiddenError, UnauthorizedError } = errors;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const OAuth2Server = require('oauth2-server');
const { Request, Response } = OAuth2Server;

const PLUGIN_NAME = 'simple-auth';

export const createStrategy = (strapi: Core.Strapi) => {
  const getService = (name: string) => strapi.plugin('users-permissions').service(name);

  const getAdvancedSettings = () => {
    return strapi.store({ type: 'plugin', name: 'users-permissions' }).get({ key: 'advanced' });
  };

  const isMethodAllowed = async (client: any, route: string, method: string): Promise<boolean> => {
    const clients = await strapi.documents(`plugin::${PLUGIN_NAME}.client-credential` as any).findMany({
      filters: {
        client_id: client.clientId,
        client_secret: client.clientSecret,
      } as any,
    });

    if (clients.length) {
      const allowedMethods: any[] = (clients[0] as any).allowed_methods || [];
      return allowedMethods.some((api: any) => route.startsWith(api.url) && api.method === method);
    }
    return false;
  };

  const buildPublicAbility = async () => {
    const publicPermissions = await getService('permission')
      .findPublicPermissions()
      .then((perms: any[]) => perms.map(getService('permission').toContentAPIPermission));

    const routes = await getService('users-permissions').getRoutes();
    for (const key in routes) {
      if (Object.hasOwnProperty.call(routes, key)) {
        for (const route of routes[key]) {
          const apiName = route.info.apiName
            ? `api::${route.info.apiName}`
            : `plugin::${route.info.pluginName}`;
          const handler = route.handler.startsWith('api::')
            ? route.handler
            : `${apiName}.${route.handler}`;
          publicPermissions.push({ action: handler });
        }
      }
    }

    return strapi.contentAPI.permissions.engine.generateAbility(publicPermissions);
  };

  const authenticate = async (ctx: any) => {
    try {
      const oauthServer = getOAuthServer(strapi);
      const token = await strapi.plugin(PLUGIN_NAME).service('auth').extractToken(ctx);
      let strapiToken: any;

      const validCSRFToken = await strapi.plugin(PLUGIN_NAME).service('auth').validateCSFRToken(ctx);
      if (validCSRFToken) {
        const ability = await buildPublicAbility();
        return { authenticated: true, credentials: null, ability };
      }

      if (token) {
        const request = new Request({
          method: 'POST',
          query: {},
          body: ctx.request.body,
          headers: ctx.req.headers,
        });

        const response = new Response({ headers: {} });
        let oauthResult: any;

        try {
          oauthResult = await Promise.all([oauthServer.authenticate(request, response)]);
          if (oauthResult?.length) {
            const isAllowed = await isMethodAllowed(oauthResult[0].client, ctx.req.url, ctx.req.method);
            if (!isAllowed) throw new Error('Method not allowed for this client');
          }
        } catch {
          strapiToken = await getService('jwt').getToken(ctx);
        }

        if (oauthResult?.length && oauthResult[0]) {
          ctx.state.user = oauthResult[0].user;
          const ability = await buildPublicAbility();
          return { authenticated: true, credentials: null, ability };
        }

        if (strapiToken) {
          const { id } = strapiToken;
          if (id === undefined) return { authenticated: false };

          const user = await getService('user').fetchAuthenticatedUser(id);
          if (!user) return { error: 'Invalid credentials' };

          const advancedSettings = await getAdvancedSettings() as any;
          if (advancedSettings.email_confirmation && !user.confirmed) return { error: 'Invalid credentials' };
          if (user.blocked) return { error: 'Invalid credentials' };

          const permissions = await Promise.resolve(user.role.id)
            .then(getService('permission').findRolePermissions)
            .then((perms: any[]) => perms.map(getService('permission').toContentAPIPermission));

          const ability = await strapi.contentAPI.permissions.engine.generateAbility(permissions);
          ctx.state.user = user;
          return { authenticated: true, credentials: user, ability };
        }
      } else {
        return { authenticated: false, credentials: null, ability: null };
      }
    } catch {
      return { authenticated: false };
    }
  };

  const verify = async (auth: any, config: any) => {
    const { credentials: user, ability } = auth;

    if (!config.scope) {
      if (!user) throw new UnauthorizedError();
      return;
    }

    if (!ability) throw new UnauthorizedError();

    const scopes: string[] = Array.isArray(config.scope) ? config.scope : [config.scope];
    const isAllowed = scopes.every((scope) => ability.can(scope));

    if (!isAllowed) throw new ForbiddenError();
  };

  return {
    name: 'users-permissions',
    authenticate,
    verify,
  };
};

import type { Core } from '@strapi/strapi';
import { getOAuthServer } from '../auth/server';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const OAuth2Server = require('oauth2-server');
const { Request, Response } = OAuth2Server;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const csrf = require('csrf');
const csrfTokens = new csrf();

const auth = ({ strapi }: { strapi: Core.Strapi }) => ({
  async count(_ctx: any) {
    return 0;
  },

  async getToken(ctx: any) {
    const oauthServer = getOAuthServer(strapi);

    const request = new Request({
      method: 'POST',
      query: {},
      body: ctx.request.body,
      headers: ctx.req.headers,
    });

    const response = new Response({ headers: {} });

    let token = oauthServer.token(request, response, {
      requireClientAuthentication: {
        authorization_code: false,
      },
    });

    token = await Promise.all([token]);

    return {
      access_token: token[0].accessToken,
      access_token_expires_at: token[0].accessTokenExpiresAt,
      token_type: 'Bearer',
      guest_id: token[0].guest_id,
      created_at: new Date(),
      expires_in: strapi.config.get('constants.ACCESS_TOKEN_LIFETIME', 60 * 60 * 24 * 15),
    };
  },

  async getRefreshToken(ctx: any) {
    const oauthServer = getOAuthServer(strapi);

    const request = new Request({
      method: 'POST',
      query: {},
      body: ctx.request.body,
      headers: ctx.req.headers,
    });

    const response = new Response({ headers: {} });

    const authenticate = oauthServer.authenticate(request, response, { scope: 'test' });
    await Promise.all([authenticate]);

    let token = oauthServer.token(request, response, {
      requireClientAuthentication: {
        authorization_code: false,
      },
    });

    token = await Promise.all([token]);

    return {
      access_token: token[0].accessToken,
      access_token_expires_at: token[0].accessTokenExpiresAt,
      token_type: 'Bearer',
      refresh_token: token[0].refreshToken,
      guest_id: token[0].guest_id,
      created_at: new Date(),
      expires_in: strapi.config.get('constants.ACCESS_TOKEN_LIFETIME', 60 * 60 * 24 * 15),
    };
  },

  extractToken(ctx: any): string | null {
    if (ctx.request?.header?.authorization) {
      const parts = ctx.request.header.authorization.split(/\s+/);
      if (parts[0].toLowerCase() !== 'bearer' || parts.length !== 2) return null;
      return parts[1];
    }
    return null;
  },

  async validateToken(token: string): Promise<boolean> {
    const oauthServer = getOAuthServer(strapi);

    const request = new Request({
      method: 'POST',
      query: {},
      body: {},
      headers: { authorization: `Bearer ${token}` },
    });

    const response = new Response({ headers: {} });

    try {
      const result = await Promise.all([oauthServer.authenticate(request, response)]);
      return !!(result?.length);
    } catch {
      return false;
    }
  },

  validateCSFRToken(ctx: any): boolean {
    try {
      const csrfToken = ctx?.request?.headers?.['x-csrf-token'];
      if (csrfToken) {
        const secretKey = process.env.X_CSRF_SECRET;
        return csrfTokens.verify(secretKey, csrfToken);
      }
      return false;
    } catch {
      return false;
    }
  },
});

export default auth;

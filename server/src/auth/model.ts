import crypto from 'crypto';
import type { Core } from '@strapi/strapi';

const PLUGIN_NAME = 'simple-strapi-auth-v5';

const authorizationCodeDb: Record<string, any> = {
  authorizationCode: '',
  expiresAt: null,
  redirectUri: '',
  client: null,
  user: null,
};

export const createModel = (strapi: Core.Strapi) => ({
  async getClient(clientId: string, clientSecret: string) {
    const clients = await strapi.documents(`plugin::${PLUGIN_NAME}.client-credential` as any).findMany({
      filters: {
        client_id: clientId,
        client_secret: clientSecret,
      } as any,
    });

    if (clients.length) {
      const client = clients[0] as any;
      return {
        clientId: client.client_id,
        clientSecret: client.client_secret,
        grants: client.grants,
        redirectUris: client.redirectUris,
      };
    }
    return null;
  },

  generateAccessToken: (_client: any, _user: any, _scope: any) => undefined,

  async saveToken(token: any, client: any, user: any) {
    const guestId = user?.guest_id || crypto.randomUUID();
    const tokenStore = await strapi.documents(`plugin::${PLUGIN_NAME}.token-store` as any).create({
      data: {
        access_token: token.accessToken,
        access_token_expires_at: token.accessTokenExpiresAt,
        refresh_token: token.refreshToken,
        refresh_token_expires_at: token.refreshTokenExpiresAt,
        client: client,
        user: user,
        guest_id: guestId,
      } as any,
    });

    const store = tokenStore as any;
    return {
      accessToken: store.access_token,
      accessTokenExpiresAt: new Date(store.access_token_expires_at),
      refreshToken: store.refresh_token,
      refreshTokenExpiresAt: store.refresh_token_expires_at ? new Date(store.refresh_token_expires_at) : null,
      client: store.client,
      user: { guest_id: store.guest_id },
      guest_id: store.guest_id,
    };
  },

  async getAccessToken(token: string) {
    const results = await strapi.documents(`plugin::${PLUGIN_NAME}.token-store` as any).findMany({
      filters: { access_token: { $in: [token] } } as any,
    });

    if (results.length) {
      const store = results[0] as any;
      return {
        accessToken: store.access_token,
        accessTokenExpiresAt: new Date(store.access_token_expires_at),
        client: store.client,
        user: { guest_id: store.guest_id },
      };
    }
    return false;
  },

  async getRefreshToken(token: string) {
    const results = await strapi.documents(`plugin::${PLUGIN_NAME}.token-store` as any).findMany({
      filters: { access_token: { $in: [token] } } as any,
    });

    if (!results.length) return false;
    const store = results[0] as any;

    return {
      accessToken: store.access_token,
      accessTokenExpiresAt: new Date(store.access_token_expires_at),
      refreshToken: '',
      refreshTokenExpiresAt: null,
      client: store.client,
      user: { guest_id: store.guest_id },
    };
  },

  async revokeToken(token: any) {
    if (!token || token === 'undefined') return false;
    await (strapi.db as any).query(`plugin::${PLUGIN_NAME}.token-store`).deleteMany({
      where: { access_token: token.accessToken },
    });
    return true;
  },

  generateAuthorizationCode: (_client: any, _user: any, _scope: any): string => {
    const seed = crypto.randomBytes(256);
    return crypto.createHash('sha1').update(seed).digest('hex');
  },

  saveAuthorizationCode: (code: any, client: any, user: any) => {
    authorizationCodeDb.authorizationCode = {
      authorizationCode: code.authorizationCode,
      expiresAt: code.expiresAt,
      client,
      user,
    };
    return Promise.resolve(
      Object.assign({ redirectUri: `${code.redirectUri}` }, authorizationCodeDb.authorizationCode)
    );
  },

  getAuthorizationCode: (_authorizationCode: string) => {
    return Promise.resolve(authorizationCodeDb.authorizationCode);
  },

  revokeAuthorizationCode: (_authorizationCode: string) => {
    authorizationCodeDb.authorizationCode = '';
    authorizationCodeDb.expiresAt = null;
    authorizationCodeDb.redirectUri = '';
    authorizationCodeDb.client = null;
    authorizationCodeDb.user = null;
    return Promise.resolve(true);
  },

  verifyScope: (_token: any, _scope: any) => {
    return Promise.resolve(true);
  },

  getUserFromClient: (_token: any) => {
    return Promise.resolve({ username: 'username' });
  },
});

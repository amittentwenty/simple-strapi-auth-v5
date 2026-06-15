import type { Core } from '@strapi/strapi';
import { createModel } from './model';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const OAuth2Server = require('oauth2-server');

let oauthServer: any = null;

export const getOAuthServer = (strapi: Core.Strapi): any => {
  if (!oauthServer) {
    oauthServer = new OAuth2Server({
      model: createModel(strapi),
      accessTokenLifetime: strapi.config.get('constants.ACCESS_TOKEN_LIFETIME', 60 * 60 * 24 * 15),
      grants: ['authorization_code', 'refresh_token', 'client_credentials'],
      refreshTokenLifetime: strapi.config.get('constants.REFRESH_TOKEN_LIFETIME', 60 * 60 * 24 * 15),
      alwaysIssueNewRefreshToken: true,
      allowEmptyState: true,
      allowExtendedTokenAttributes: true,
    });
  }
  return oauthServer;
};

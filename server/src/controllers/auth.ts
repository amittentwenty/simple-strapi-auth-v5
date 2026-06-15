import type { Core } from '@strapi/strapi';

const PLUGIN_NAME = 'simple-strapi-auth-v5';

const auth = ({ strapi }: { strapi: Core.Strapi }) => ({
  async count(ctx: any) {
    ctx.body = await strapi.plugin(PLUGIN_NAME).service('auth').count(ctx);
  },

  async token(ctx: any) {
    ctx.body = await strapi.plugin(PLUGIN_NAME).service('auth').getToken(ctx);
  },

  async refreshToken(ctx: any) {
    ctx.body = await strapi.plugin(PLUGIN_NAME).service('auth').getRefreshToken(ctx);
  },
});

export default auth;

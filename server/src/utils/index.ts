import type { Core } from '@strapi/strapi';
import * as sanitize from './sanitize';

export { sanitize };

export const getService = (strapi: Core.Strapi, name: string) => {
  return strapi.plugin('users-permissions').service(name);
};

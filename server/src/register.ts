import type { Core } from '@strapi/strapi';
import { createStrategy } from './strategies/users-permissions';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  const authStrategy = createStrategy(strapi);
  strapi.get('auth').register('content-api', authStrategy);
};

export default register;
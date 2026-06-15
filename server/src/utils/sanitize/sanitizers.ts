import { traverseEntity, pipeAsync } from '@strapi/utils';
import { removeUserRelationFromRoleEntities } from './visitors';

const sanitizeUserRelationFromRoleEntities = (schema: any) => (entity: any) => {
  return traverseEntity(removeUserRelationFromRoleEntities, { schema }, entity);
};

const defaultSanitizeOutput = (schema: any) => (entity: any) => {
  return pipeAsync(sanitizeUserRelationFromRoleEntities(schema))(entity);
};

export { sanitizeUserRelationFromRoleEntities, defaultSanitizeOutput };

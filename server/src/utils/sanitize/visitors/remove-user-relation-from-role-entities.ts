const removeUserRelationFromRoleEntities = (
  { schema, key, attribute }: { schema: any; key: string; attribute: any },
  { remove }: { remove: (key: string) => void }
) => {
  if (
    attribute.type === 'relation' &&
    attribute.target === 'plugin::users-permissions.user' &&
    schema.uid === 'plugin::users-permissions.role'
  ) {
    remove(key);
  }
};

export { removeUserRelationFromRoleEntities };

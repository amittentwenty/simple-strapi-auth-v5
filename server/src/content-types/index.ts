import auth from './auth/schema.json';
import clientCredential from './client-credential/schema.json';
import tokenStore from './token-store/schema.json';

export default {
  auth: { schema: auth },
  'client-credential': { schema: clientCredential },
  'token-store': { schema: tokenStore },
};
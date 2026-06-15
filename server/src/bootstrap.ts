import type { Core } from "@strapi/strapi";

const PLUGIN_TABLES = ["client_credentials", "token_stores", "auths"];

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  // Ensure every row in this plugin's tables has a document_id.
  // Rows can be missing one if they were inserted before the plugin was first
  // registered with Strapi (common after a v4→v5 migration).
  const knex = strapi.db.connection;

  for (const table of PLUGIN_TABLES) {
    try {
      const exists = await knex.schema.hasTable(table);
      if (!exists) continue;

      const hasDocId = await knex.schema.hasColumn(table, "document_id");
      if (!hasDocId) continue;

      await knex.raw(
        `UPDATE ?? SET document_id = substring(
            md5(random()::text || id::text || clock_timestamp()::text) ||
            md5(random()::text), 1, 24
          ) WHERE document_id IS NULL OR document_id = ''`,
        [table]
      );
    } catch {
      // Non-fatal: log and continue so a bad table never blocks startup
      strapi.log.warn(`[simple-strapi-auth] Could not fix document_id for table: ${table}`);
    }
  }
};

export default bootstrap;
## 2025-01-30

Drizzle custom migration using sql commands.
https://orm.drizzle.team/docs/drizzle-config-file

Currently, running custom JavaScript and TypeScript migration/seeding scripts is not supported yet in drizzle and will be added in the upcoming release, you can follow github discussion.
https://github.com/drizzle-team/drizzle-orm/discussions/2832

### How to Safely Migrate the Database (Drizzle ORM)

**IMPORTANT RULES – MUST BE FOLLOWED BY EVERY DEVELOPER**

- **Never** use `yarn drizzle-kit push`
- **Never** use `yarn dbsync` or any other destructive sync command  
  These commands can destroy data or cause irreversible schema drift in production.

All schema changes **must** go through custom SQL migrations.

#### Required configuration (already present in `drizzle.config.ts`)

```ts
migrations: {
  prefix: "timestamp",
  table: "__drizzle_migrations__",
  schema: "public",
},
```

Then follow steps below:

1. Generate a new custom migration file

Replace change_audit_logs.user_id_to_integer with a short, descriptive, snake_case name that clearly describes what the migration does.

```
yarn drizzle-kit generate --custom --name=<your-migration-name>
# Example:
yarn drizzle-kit generate --custom --name=change_audit_logs.user_id_to_integer

```

2. Write your SQL

Open the newly generated .sql file and add your raw SQL statements (ALTER TABLE, CREATE INDEX, data fixes, etc.).

3. Commit the SQL file together with your code changes.

4. Apply the migration locally or in any environment

```
yarn db:migrate
```

## 2024-12-08

Have to use 2 letter relationship names. Otherwise running into this bug, with 7 level deep nested with queries.

https://github.com/drizzle-team/drizzle-orm/issues/2066

```

export const eventRel = relations(eventTable, ({one, many}) => ({
ps: many(eventRelationshipTable, {relationName: "child"}),
cs: many(eventRelationshipTable, {relationName: "parent"})
}));

```

```

```

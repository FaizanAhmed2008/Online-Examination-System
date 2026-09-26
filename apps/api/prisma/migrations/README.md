# Migrations

Prisma migration history lives here. Every migration is a directory named
`<timestamp>_<name>` containing `migration.sql`, and it is committed to the repository.

Workflow:

```bash
npm run db:migrate     # create a migration for schema changes and apply it (development)
npm run db:deploy      # apply pending migrations only (shared/staging environments)
npm run db:status      # compare the database with the migration history
```

Rules:

- Never edit a migration that has already been applied. Add a new one.
- A model and its migration are always added in the same change.
- Generated Prisma client code is not committed; it is produced by `npm run db:generate`.

The directory is currently empty: the schema has no models yet, so there is nothing to migrate.
The first migration is created together with the first feature that needs a table.

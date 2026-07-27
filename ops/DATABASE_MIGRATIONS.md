# MCQ database migration runbook

The migration chain now starts with
`202607160000_baseline`. That migration creates the core schema exactly as it
existed at commit `1cdba93c2d89220e6b59b27e0e29f6fefd6bf4f4`, immediately
before the first historical incremental migration. It was generated with
Prisma's empty-to-schema migration diff, not reconstructed by hand.

## Existing production database: one-time baseline registration

The live MCQ database already contains the core tables. Prisma must therefore
record the baseline as applied **before** the first deployment that contains
it. Otherwise `prisma migrate deploy` will try to create tables that already
exist and stop.

Perform this once during a maintenance window:

1. Create a current database and upload backup, copy it off-host, and pass the
   disposable restore check described in [README.md](README.md).
2. Confirm that this is the existing MCQ production database—not a new or
   empty database—and review its current migration state:

   ```bash
   cd /var/www/handyant
   npx prisma migrate status
   ```

   Stop if any historical migration that is already reflected in the live
   tables appears as pending. Reconcile its migration record against the
   database and its reviewed SQL before continuing; running it again can be
   destructive.

3. With the release containing the baseline present, but before running
   `prisma migrate deploy`, register only the baseline:

   ```bash
   npx prisma migrate resolve --applied 202607160000_baseline
   ```

4. Confirm the baseline now appears as applied, then deploy the remaining
   migrations:

   ```bash
   npx prisma migrate status
   npx prisma migrate deploy
   npx prisma migrate status
   ```

Do not run `migrate resolve --applied` against a fresh database. Do not mark
any later migration applied unless its SQL has independently been verified as
already present. Keep the backup and the command output with the release
record.

## Fresh or disposable database

A new database should execute the full chain normally:

```bash
npx prisma migrate deploy
npx prisma migrate status
```

The expected order begins:

1. `202607160000_baseline`
2. `202607160001_home_subscription_visits`
3. `202607160002_production_readiness`
4. `202607190001_link_home_todos_to_booking_tasks`

Later migrations follow in timestamp order. Never run the baseline SQL
manually and then run `migrate deploy`; either let Prisma execute it on an
empty database or register it on a pre-existing database as described above.

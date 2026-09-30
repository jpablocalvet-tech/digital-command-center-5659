# Apply V0.2.1 patch

Replace the matching files in the repository with the files in this patch, preserving the folder structure.

Then run:

```bash
bun run db:push
bun run build
bun run dev
```

Do not re-run the seed on your existing test database unless you intentionally want to reset test data.

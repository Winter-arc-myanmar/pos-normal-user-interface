# Frontend Template

Neutral React + TypeScript starter with clean architecture layers for authenticated apps.

Use it for admin dashboards, internal tools, or other product UIs. Replace the example Users/Customers surfaces with your own features.

## Start here

- Architecture guide: [architecture.md](./architecture.md)
- Agent/contributor rules: [AGENTS.md](./AGENTS.md)
- Project guide: [docs/PROJECT_GUIDE.md](./docs/PROJECT_GUIDE.md)
- Core map: [src/core/README.md](./src/core/README.md)

## What is included

- Auth flow (`useAuth`, login page, token cookies)
- App shell + router + permission skeleton
- Example Users list page
- Example Customers CRUD page
- Shared UI primitives (table, metric card, loading states, theme/language toggles)

## Scripts

```bash
npm install
npm run dev
npm run build
npm run test
npm run lint
```

## Environment

Create a `.env` file:

```bash
VITE_API_URL=http://localhost:3000
```

Update endpoint paths in `src/core/infrastructure/api/constants.ts` to match your backend.

## Adding a feature

Follow the checklist in [architecture.md](./architecture.md):

domain → application → infrastructure → DI registration → presentation hook → page/route/shell.

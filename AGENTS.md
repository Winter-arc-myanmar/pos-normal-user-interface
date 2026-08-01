# AGENTS.md

This file applies to the entire repository.

## Purpose

Use this project as a **reusable frontend template** for authenticated apps.
It may become an admin dashboard, an internal tool, or another product UI.

When implementing features, prioritize:

- following [architecture.md](./architecture.md)
- exact backend contract matching
- permission-aware route/sidebar behavior when your app needs it
- consistency with existing page, hook, and service patterns
- minimal, focused changes

## Tech Stack

- React with functional components and hooks
- TypeScript
- Vite
- Axios via `HttpClient`
- Tailwind CSS for UI styling
- Framer Motion for shell/page transitions
- i18n is present; new features should add keys in `src/lib/i18n/locales/en.json`

## Architecture (required)

Follow the onion layers in [architecture.md](./architecture.md):

1. **Domain** — entities + repository/service interfaces in `src/core/domain`
2. **Application** — DTOs + service implementations in `src/core/application`
3. **Infrastructure** — `HttpClient`, API repositories, endpoint constants, DI container
4. **Presentation** — React hooks in `src/core/presentation/hooks`
5. **UI** — thin pages/components that call hooks only

**Do not** call Axios/`HttpClient` from pages.
**Do not** invent a parallel `src/features/<feature>/<feature>Api.ts` bypass pattern.

## How to add a feature

Work inside-out:

1. Confirm the backend endpoint contract
2. Add/extend domain entity + interfaces
3. Add DTOs
4. Implement application service
5. Implement `Api*Repository` and add paths in `src/core/infrastructure/api/constants.ts`
6. Register repository/service in `src/core/infrastructure/di/container.ts`
7. Add presentation hook
8. Add page under `src/pages/`
9. Add route in `src/app/router/AppRouter.tsx`
10. Add sidebar item in `src/widgets/layout/AppShell.tsx`
11. Add permission mapping in `src/features/permissions/usePermissions.ts` when needed
12. Run `npm run build`

Starter examples already in the template:

- Auth (`useAuth`)
- Users (`useUserManagement`)
- Customers (`useCustomerManagement`) — the extra end-to-end resource example

## API Rules

- Never guess request payload field names
- Match backend request/response shapes exactly
- Normalize inconsistent response shapes inside infrastructure repositories or application services, not inside page components
- Keep auth-aware Axios behavior consistent with `HttpClient`

## Permission Rules

- `src/features/permissions/usePermissions.ts` is a skeleton
- Full-access role handling and `permissions[]` come from the authenticated user
- Sidebar visibility and route access must use the same permission source
- Do not invent permission keys unless the backend provides them
- Adapt role names/keys to your product; this template is not admin-only

## UI Rules

- Use Tailwind utility classes for layout and styling
- Reuse shared UI components in `src/components/ui` where possible
- Prefer clean, compact layouts over custom one-off designs
- Keep pages thin; business logic belongs in services/hooks

## Routing and Access

- Route guards should redirect to the first allowed page when appropriate
- If the user lacks access and no allowed page exists, show the access denied view

## Validation Rules

- Run `npm run build` after meaningful frontend changes
- Fix compile errors caused by your changes
- Do not attempt to fix unrelated warnings unless asked

## Change Discipline

- Keep changes surgical
- Do not rename existing files or abstractions without strong reason
- Do not rewrite unrelated modules
- Do not add speculative abstractions unless there is immediate reuse

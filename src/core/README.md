# Core architecture

This directory implements the onion architecture described in the root [`architecture.md`](../../architecture.md).

## Directory structure

```
src/core/
├── domain/             # Entities and interfaces (no React, no HTTP)
│   ├── entities/
│   ├── repositories/
│   └── services/
├── application/        # DTOs and use-case services
│   ├── dtos/
│   └── services/
├── infrastructure/     # HttpClient, API repos, DI container
│   ├── api/
│   ├── repositories/
│   ├── services/
│   └── di/
└── presentation/       # React hooks for UI
    └── hooks/
```

## Starter examples

| Concern | Hook | Service key |
|---------|------|-------------|
| Auth | `useAuth` | `authService` |
| Users | `useUserManagement` | `userService` |
| Customers (example resource) | `useCustomerManagement` | `customerService` |

## Dependency injection

```typescript
import container from "@/core/infrastructure/di/container";

const authService = container.resolve("authService");
const customerService = container.resolve("customerService");
```

## Using hooks in components

```typescript
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { useCustomerManagement } from "@/core/presentation/hooks/useCustomerManagement";

function MyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();
  const { customers, getCustomers } = useCustomerManagement();
}
```

## Adding a new feature

1. Domain entity + interfaces
2. Application DTOs + service
3. Infrastructure repository + endpoint constants
4. Register in `infrastructure/di/container.ts`
5. Presentation hook
6. Thin page/UI

See root `architecture.md` for the full checklist.

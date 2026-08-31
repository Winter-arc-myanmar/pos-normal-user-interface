import { Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import {
  PAGE_PERMISSIONS,
  PERMISSION_ROUTE_ORDER,
  usePermissions,
} from "@/features/permissions/usePermissions";

const LoginPage = lazy(() =>
  import("../../pages/LoginPage").then((module) => ({
    default: module.LoginPage,
  }))
);
const DashboardPage = lazy(() =>
  import("../../pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  }))
);
const CashierPage = lazy(() =>
  import("../../pages/CashierPage").then((module) => ({
    default: module.CashierPage,
  }))
);
const WaitlistPage = lazy(() =>
  import("../../pages/WaitlistPage").then((module) => ({
    default: module.WaitlistPage,
  }))
);
const TipPoolsPage = lazy(() =>
  import("../../pages/TipPoolsPage").then((module) => ({
    default: module.TipPoolsPage,
  }))
);
const CounterOrdersPage = lazy(() =>
  import("../../pages/CounterOrdersPage").then((module) => ({
    default: module.CounterOrdersPage,
  }))
);
const UsersPage = lazy(() =>
  import("../../pages/UsersPage").then((module) => ({
    default: module.UsersPage,
  }))
);
const CustomersPage = lazy(() =>
  import("../../pages/CustomersPage").then((module) => ({
    default: module.CustomersPage,
  }))
);
const SyncPage = lazy(() =>
  import("../../pages/SyncPage").then((module) => ({
    default: module.SyncPage,
  }))
);
const PosSettingsPage = lazy(() =>
  import("../../pages/PosSettingsPage").then((module) => ({
    default: module.PosSettingsPage,
  }))
);
const NotFoundPage = lazy(() =>
  import("../../pages/NotFoundPage").then((module) => ({
    default: module.NotFoundPage,
  }))
);
const AppShell = lazy(() =>
  import("../../widgets/layout/AppShell").then((module) => ({
    default: module.AppShell,
  }))
);

function RouteFallback() {
  return <LoadingScreen />;
}

function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <RouteFallback />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

function UnauthorizedPage() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-3xl">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t("router.accessDeniedTitle")}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {t("router.accessDeniedDescription")}
        </p>
      </div>
    </section>
  );
}

function PermissionRedirect() {
  const { isLoading } = useAuth();
  const { canAccess } = usePermissions();

  if (isLoading) return <RouteFallback />;

  const firstAccessibleRoute = PERMISSION_ROUTE_ORDER.find((entry) =>
    canAccess(entry.permissions)
  );

  if (firstAccessibleRoute) {
    return <Navigate to={firstAccessibleRoute.path} replace />;
  }

  return <UnauthorizedPage />;
}

function RequirePermission({
  requiredPermissions,
  redirectToFirstAllowed = true,
  children,
}: {
  requiredPermissions: readonly string[];
  redirectToFirstAllowed?: boolean;
  children: React.ReactNode;
}) {
  const { isLoading } = useAuth();
  const { canAccess } = usePermissions();
  const location = useLocation();

  if (isLoading) return <RouteFallback />;
  if (!canAccess(requiredPermissions)) {
    if (redirectToFirstAllowed) {
      const firstAccessibleRoute = PERMISSION_ROUTE_ORDER.find((entry) =>
        canAccess(entry.permissions)
      );

      if (
        firstAccessibleRoute &&
        firstAccessibleRoute.path !== location.pathname
      ) {
        return <Navigate to={firstAccessibleRoute.path} replace />;
      }
    }

    return <UnauthorizedPage />;
  }
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<PermissionRedirect />} />
              <Route
                path="/dashboard"
                element={
                  <RequirePermission
                    requiredPermissions={PAGE_PERMISSIONS.dashboard}
                  >
                    <DashboardPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/cashier"
                element={
                  <RequirePermission
                    requiredPermissions={PAGE_PERMISSIONS.cashier}
                  >
                    <CashierPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/waitlist"
                element={
                  <RequirePermission
                    requiredPermissions={PAGE_PERMISSIONS.waitlist}
                  >
                    <WaitlistPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/tip-pools"
                element={
                  <RequirePermission
                    requiredPermissions={PAGE_PERMISSIONS.tipPools}
                  >
                    <TipPoolsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/counter-orders"
                element={
                  <RequirePermission
                    requiredPermissions={PAGE_PERMISSIONS.counterOrders}
                  >
                    <CounterOrdersPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/users"
                element={
                  <RequirePermission
                    requiredPermissions={PAGE_PERMISSIONS.users}
                  >
                    <UsersPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/customers"
                element={
                  <RequirePermission
                    requiredPermissions={PAGE_PERMISSIONS.customers}
                  >
                    <CustomersPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/sync"
                element={
                  <RequirePermission
                    requiredPermissions={PAGE_PERMISSIONS.sync}
                  >
                    <SyncPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/settings"
                element={
                  <RequirePermission
                    requiredPermissions={PAGE_PERMISSIONS.settings}
                  >
                    <Navigate to="/settings/cashier" replace />
                  </RequirePermission>
                }
              />
              <Route
                path="/settings/:tab"
                element={
                  <RequirePermission
                    requiredPermissions={PAGE_PERMISSIONS.settings}
                  >
                    <PosSettingsPage />
                  </RequirePermission>
                }
              />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

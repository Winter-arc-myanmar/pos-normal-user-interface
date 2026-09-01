import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import {
  PAGE_PERMISSIONS,
  usePermissions,
} from "@/features/permissions/usePermissions";
import { PosActionRail } from "./PosActionRail";
import { PosIconRail, type PosRailItem } from "./PosIconRail";

const iconClass = "h-5 w-5";

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass} aria-hidden="true">
      <path d="M4 4h6v6H4zM14 4h6v9h-6zM4 14h6v6H4zM14 17h6v3h-6z" />
    </svg>
  );
}

function CashierIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass} aria-hidden="true">
      <path d="M4 5h16v14H4zM7 9h10M7 13h6M8 19v2M16 19v2" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass} aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2M16 5a3 3 0 0 1 0 6M18 14a4 4 0 0 1 3 4v2" />
    </svg>
  );
}

function CustomersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass} aria-hidden="true">
      <path d="M4 5h16v15H4zM8 3v4M16 3v4M4 10h16" />
    </svg>
  );
}

function WaitlistIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass} aria-hidden="true">
      <circle cx="8" cy="8" r="3" />
      <path d="M3 20v-2a5 5 0 0 1 10 0v2M16 7h5M16 12h5M16 17h5" />
    </svg>
  );
}

function TipsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M15 8.5c-.6-.7-1.5-1-2.6-1-1.4 0-2.4.7-2.4 1.8 0 2.8 5.5 1.3 5.5 4.2 0 1.2-1.1 2-2.7 2-1.2 0-2.3-.4-3-1.2M12.5 5.5v2M12.5 15.5v2" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass} aria-hidden="true">
      <path d="M6 3h12v18H6zM9 7h6M9 11h6M9 15h4" />
    </svg>
  );
}

function SalesOrdersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass} aria-hidden="true">
      <path d="M4 7h16v13H4z" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass} aria-hidden="true">
      <path d="M4 7h11a4 4 0 0 1 0 8H9" />
      <path d="m7 11-3-3 3-3M20 17H9a4 4 0 0 1 0-8h6" />
      <path d="m17 13 3 3-3 3" />
    </svg>
  );
}

export function AppShell() {
  const { t } = useTranslation();
  const { user, setActiveBranch } = useAuth();
  const { canAccess } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const isPosWorkspace = [
    "/cashier",
    "/sales-orders",
    "/waitlist",
    "/tip-pools",
    "/counter-orders",
    "/customers",
  ].some((path) => location.pathname.startsWith(path));
  const isFullBleedLightPage = ["/settings", "/sync"].some((path) =>
    location.pathname.startsWith(path)
  );

  const currentUserName =
    user?.nickname || user?.name || t("shell.userFallback");
  const branchIds = Array.from(
    new Set(
      (user?.branchAccess || [])
        .map((entry) => entry.branchId)
        .filter(Boolean)
    )
  );

  const railItems: PosRailItem[] = [
    {
      to: "/cashier",
      label: t("shell.cashierTitle"),
      icon: <CashierIcon />,
      visible: canAccess(PAGE_PERMISSIONS.cashier),
    },
    {
      to: "/counter-orders",
      label: t("shell.counterOrdersTitle"),
      icon: <OrdersIcon />,
      visible: canAccess(PAGE_PERMISSIONS.counterOrders),
    },
    {
      to: "/sales-orders",
      label: t("shell.salesOrdersTitle"),
      icon: <SalesOrdersIcon />,
      visible: canAccess(PAGE_PERMISSIONS.salesOrders),
    },
    {
      to: "/customers",
      label: t("shell.customersTitle"),
      icon: <CustomersIcon />,
      visible: canAccess(PAGE_PERMISSIONS.customers),
    },
    {
      to: "/waitlist",
      label: t("shell.waitlistTitle"),
      icon: <WaitlistIcon />,
      visible: canAccess(PAGE_PERMISSIONS.waitlist),
    },
    {
      to: "/tip-pools",
      label: t("shell.tipPoolsTitle"),
      icon: <TipsIcon />,
      visible: canAccess(PAGE_PERMISSIONS.tipPools),
    },
    {
      to: "/sync",
      label: t("shell.syncTitle"),
      icon: <SyncIcon />,
      visible: canAccess(PAGE_PERMISSIONS.sync),
    },
    {
      to: "/dashboard",
      label: t("shell.dashboardTitle"),
      icon: <DashboardIcon />,
      visible: canAccess(PAGE_PERMISSIONS.dashboard),
    },
    {
      to: "/users",
      label: t("shell.usersTitle"),
      icon: <UsersIcon />,
      visible: canAccess(PAGE_PERMISSIONS.users),
    },
  ];

  const openCashierView = (view: "menu" | "orders" | "pay") => {
    navigate(`/cashier?view=${view}`);
  };

  const handleBranchChange = async (branchId: string) => {
    try {
      await setActiveBranch(branchId);
      openCashierView("orders");
    } catch (error) {
      console.error("Unable to switch branch:", error);
    }
  };

  return (
    <div className="pos-app-shell grid h-[100dvh] min-h-[480px] min-w-[768px] grid-cols-[3.5rem_minmax(0,1fr)_6.5rem] overflow-hidden bg-black">
      <PosIconRail
        items={railItems}
        userName={currentUserName}
        profileLabel={t("settings.profileLabel")}
        printerLabel={t("shell.printer")}
        printerBadgeCount={1}
        onPrinterClick={() => navigate("/settings/printer")}
        onProfileClick={() => navigate("/settings/cashier")}
      />

      <main
        className={[
          "min-h-0 min-w-0 overflow-hidden",
          isPosWorkspace
            ? "bg-[#080808]"
            : isFullBleedLightPage
              ? "overflow-hidden bg-slate-100"
              : "overflow-y-auto bg-slate-100 p-4 text-slate-900 sm:p-5",
        ].join(" ")}
      >
        <Outlet />
      </main>

      <PosActionRail
        drawerLabel={t("shell.drawer")}
        menuLabel={t("shell.menu")}
        ordersLabel={t("shell.orders")}
        payLabel={t("shell.pay")}
        branchLabel={t("shell.branch")}
        activeBranchId={user?.activeBranchId}
        branches={branchIds}
        onBranchChange={(branchId) => void handleBranchChange(branchId)}
        onMenu={() => openCashierView("menu")}
        onOrders={() => navigate("/counter-orders")}
        onPay={() => openCashierView("pay")}
      />
    </div>
  );
}

import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LoadingScreen } from "./LoadingScreen";

type NetworkStatusGateProps = {
  children: ReactNode;
};

export function NetworkStatusGate({ children }: NetworkStatusGateProps) {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <LoadingScreen
        title={t("networkStatus.offlineTitle")}
        subtitle={t("networkStatus.offlineSubtitle")}
        badge={t("networkStatus.offlineBadge")}
      />
    );
  }

  return <>{children}</>;
}

import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/core/presentation/hooks/useAuth";

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.1A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a17.5 17.5 0 0 1-3.2 4.1" />
      <path d="M6.1 6.1C4 7.7 2.5 10 2 12s3.5 7 10 7c1.4 0 2.7-.2 3.9-.6" />
    </svg>
  );
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, isAuthenticated, isLoading, error } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname?: string } })?.from
    ?.pathname;

  if (isAuthenticated && user) {
    return <Navigate to={from || "/dashboard"} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    try {
      await login(identifier.trim(), password);
      navigate(from || "/dashboard", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("login.errorFallback");
      setLocalError(message);
    }
  };

  return (
    <section className="authPage">
      <div className="authCard authCardSimple">
        <div className="authHero">
          <div className="authHeroInner">
            <div className="loadingOrbits" aria-hidden="true">
              <div className="loadingOrbit loadingOrbitOuter">
                <span className="loadingOrbitDot loadingOrbitDotOuter" />
              </div>
              <div className="loadingOrbit loadingOrbitMiddle">
                <span className="loadingOrbitDot loadingOrbitDotMiddle" />
              </div>
              <div className="loadingOrbit loadingOrbitInner">
                <span className="loadingOrbitDot loadingOrbitDotInner" />
              </div>
            </div>
            <div className="loadingLogoWrap authLogoWrap">
              <div className="brandTitle">{t("shell.brandTitle")}</div>
            </div>
          </div>
        </div>
        <h1 className="authTitle">{t("login.title")}</h1>
        <p className="authSubtitle">{t("login.subtitle")}</p>

        <form className="authForm" onSubmit={handleSubmit}>
          <label className="authLabel" htmlFor="identifier">
            {t("login.identifierLabel")}
          </label>
          <input
            id="identifier"
            className="authInput"
            type="text"
            autoComplete="username"
            placeholder={t("login.identifierPlaceholder")}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
          />

          <label className="authLabel" htmlFor="password">
            {t("login.passwordLabel")}
          </label>
          <div className="authPasswordField">
            <input
              id="password"
              className="authInput authPasswordInput"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder={t("login.passwordPlaceholder")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              className="authPasswordToggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword
                  ? t("login.hidePassword")
                  : t("login.showPassword")
              }
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          {(localError || error) && (
            <p className="authError">{localError || error}</p>
          )}

          <button className="btn authSubmit" type="submit" disabled={isLoading}>
            {isLoading ? t("login.submitting") : t("login.submit")}
          </button>
        </form>
      </div>
    </section>
  );
}

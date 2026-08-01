type LoadingScreenProps = {
  badge?: string;
  title?: string;
  subtitle?: string;
};

export function LoadingScreen({
  badge,
  title = "Loading...",
  subtitle = "Preparing your workspace.",
}: LoadingScreenProps) {
  return (
    <section className="loadingScreen" aria-live="polite" aria-busy="true">
      {badge ? <div className="loadingBadge">{badge}</div> : null}
      <div className="loadingScreenInner">
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
          <span className="loadingParticle loadingParticleOne" />
          <span className="loadingParticle loadingParticleTwo" />
          <span className="loadingParticle loadingParticleThree" />
        </div>
        <div className="loadingLogoWrap">
          <div className="brandTitle">App</div>
        </div>
      </div>
      <h1 className="loadingTitle">{title}</h1>
      <p className="loadingSubtitle">{subtitle}</p>
    </section>
  );
}

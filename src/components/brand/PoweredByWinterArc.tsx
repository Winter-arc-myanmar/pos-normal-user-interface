import { WinterArcLogo } from "./WinterArcLogo";
import "./winterArcLogo.css";

const WINTER_ARC_URL = "https://winterarc.asia/";

export interface PoweredByWinterArcProps {
  /** Width of the crystal, in pixels. Kept small for the POS shell. */
  size?: number;
  className?: string;
}

/**
 * The brand line the company app shows: the animated mark over a shimmering
 * "Powered by Winter Arc Myanmar". The app version is printed separately.
 */
export function PoweredByWinterArc({ size = 18, className }: PoweredByWinterArcProps) {
  return (
    <a
      href={WINTER_ARC_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "group flex flex-col items-center justify-center gap-1.5 rounded-md transition-opacity hover:opacity-90 active:opacity-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ec4ff]/60",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Powered by Winter Arc Myanmar — visit winterarc.asia"
      title="Powered by Winter Arc Myanmar"
    >
      <WinterArcLogo size={size} />
      <span className="powered-by-winter-arc-text block text-center text-[10px] font-medium leading-tight tracking-wide text-white/70 group-hover:text-white/90">
        <span className="powered-by-winter-arc-prefix">Powered by </span>
        <span className="powered-by-winter-arc-brand">Winter Arc Myanmar</span>
      </span>
    </a>
  );
}

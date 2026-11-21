import { useId, useMemo, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import "./winterArcLogo.css";

type SnowVariant = "speck" | "flake" | "crystal";

interface SnowflakeParticle {
  id: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
  blur: number;
  sway: number;
  rotate: number;
  variant: SnowVariant;
  pattern: 1 | 2;
}

const cx = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

/** Deterministic pseudo-random values — stable across renders. */
function seed(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function roundTo(value: number, decimals = 3): number {
  return Number(value.toFixed(decimals));
}

function buildSnowflakes(count: number): SnowflakeParticle[] {
  return Array.from({ length: count }, (_, i) => {
    const r = seed(i, 1);
    const r2 = seed(i, 2);
    const r3 = seed(i, 3);
    const r4 = seed(i, 4);

    const variantRoll = r3;
    const variant: SnowVariant =
      variantRoll < 0.45 ? "speck" : variantRoll < 0.82 ? "flake" : "crystal";

    const depth = 0.35 + r * 0.65;
    const size =
      variant === "speck"
        ? 1 + r2 * 1.2
        : variant === "flake"
          ? 2 + r2 * 2.2
          : 2.8 + r2 * 2.5;

    return {
      id: i,
      left: roundTo(4 + r * 92),
      size: roundTo(size),
      delay: roundTo(r2 * 3.2),
      duration: roundTo(2.8 + (1 - depth) * 2.4 + r4 * 1.6),
      opacity: roundTo(0.25 + depth * 0.55),
      blur: roundTo(
        variant === "speck" ? 0.4 + r * 1.2 : variant === "flake" ? r * 0.6 : 0
      ),
      sway: roundTo(-14 + r2 * 28),
      rotate: roundTo(120 + r3 * 420),
      variant,
      pattern: r4 > 0.5 ? 2 : 1,
    };
  });
}

function particleCountForSize(size: number): number {
  if (size <= 30) return 14;
  if (size <= 44) return 20;
  return 26;
}

/** Inline snowflake so its colours and gradients stay crisp at any size. */
function SnowflakeIcon() {
  // The shell can show the mark more than once; each copy needs its own arm.
  const armId = `winter-arc-arm-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="none"
      aria-hidden="true"
      className="h-full w-full text-sky-100 drop-shadow-[0_1px_0_rgba(255,255,255,0.15)]"
    >
      <g
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g transform="translate(256 256)">
          <g id={armId}>
            <path d="M0 -8 L0 -168" />
            <path d="M0 -48 L-28 -68" />
            <path d="M0 -48 L28 -68" />
            <path d="M0 -96 L-22 -112" />
            <path d="M0 -96 L22 -112" />
            <path d="M0 -136 L-16 -148" />
            <path d="M0 -136 L16 -148" />
          </g>
          <use href={`#${armId}`} transform="rotate(60)" />
          <use href={`#${armId}`} transform="rotate(120)" />
          <use href={`#${armId}`} transform="rotate(180)" />
          <use href={`#${armId}`} transform="rotate(240)" />
          <use href={`#${armId}`} transform="rotate(300)" />
        </g>
      </g>
      <g fill="currentColor">
        <g transform="translate(256 256)">
          <circle cx="0" cy="-168" r="12" />
          <circle cx="0" cy="0" r="16" />
        </g>
      </g>
    </svg>
  );
}

/** Falling snow + soft breeze around the mark. */
function Snowfall({ size }: { size: number }) {
  const reduceMotion = useReducedMotion();
  const count = particleCountForSize(size);
  const snowflakes = useMemo(() => buildSnowflakes(count), [count]);

  if (reduceMotion) return null;

  const spreadW = Math.round(size * 1.95);
  const spreadH = Math.round(size * 2.35);

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[50%] overflow-visible"
      style={{ width: spreadW, height: spreadH }}
      aria-hidden
    >
      <div className="absolute inset-0 overflow-hidden rounded-full">
        <span className="winter-arc-breeze winter-arc-breeze-1" />
        <span className="winter-arc-breeze winter-arc-breeze-2" />
        <span className="winter-arc-breeze winter-arc-breeze-3" />
      </div>

      <div
        className="winter-arc-snow-field absolute inset-0"
        style={{ ["--snow-fall-height" as string]: `${spreadH}px` } as CSSProperties}
      >
        {snowflakes.map((flake) => (
          <span
            key={flake.id}
            className={cx(
              "winter-arc-snowflake",
              `winter-arc-snowflake--${flake.variant}`,
              flake.pattern === 2
                ? "winter-arc-snowflake--pattern-b"
                : "winter-arc-snowflake--pattern-a"
            )}
            style={
              {
                left: `${flake.left}%`,
                width: flake.size,
                height: flake.size,
                animationDelay: `${flake.delay}s`,
                animationDuration: `${flake.duration}s`,
                filter: flake.blur > 0 ? `blur(${flake.blur}px)` : undefined,
                ["--snow-opacity" as string]: String(flake.opacity),
                ["--snow-sway" as string]: `${flake.sway}px`,
                ["--snow-rotate" as string]: `${flake.rotate}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

/** Organic tumble keyframes — uneven timing mimics a floating ice crystal. */
const TUMBLE = {
  rotateX: [14, -8, 6, -12, 10, -6, 14],
  rotateY: [0, 28, -22, 38, -16, 24, 0],
  rotateZ: [-5, 3, -2, 4, -3, 2, -5],
  y: [0, -4, 1, -3, 2, -2, 0],
  scale: [1, 1.03, 0.98, 1.02, 0.99, 1.01, 1],
};

const SHADOW = {
  scaleX: [1, 0.82, 0.94, 0.78, 0.9, 0.85, 1],
  opacity: [0.32, 0.18, 0.26, 0.14, 0.24, 0.2, 0.32],
};

const GLOW = {
  opacity: [0.35, 0.72, 0.42, 0.68, 0.38, 0.6, 0.35],
  scale: [0.88, 1.08, 0.92, 1.05, 0.9, 1.02, 0.88],
};

const SHIMMER_SWEEP = {
  x: ["-130%", "130%"],
};

const BREEZE_SWAY = {
  x: [0, 5, -4, 6, -3, 4, 0],
};

export interface WinterArcLogoProps {
  /** Width of the crystal, in pixels. Kept small for the POS shell. */
  size?: number;
  className?: string;
}

/** The Winter Arc mark: a tumbling ice crystal with snow drifting around it. */
export function WinterArcLogo({ size = 20, className }: WinterArcLogoProps) {
  const reduceMotion = useReducedMotion();
  const depth = Math.max(12, Math.round(size * 0.35));
  const frameH = size + Math.round(size * 0.12);

  if (reduceMotion) {
    return (
      <div
        className={cx("relative flex items-center justify-center", className)}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <div className="winter-arc-logo-image flex h-[88%] w-[88%] items-center justify-center">
          <SnowflakeIcon />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cx("winter-arc-logo-3d relative flex items-end justify-center", className)}
      style={{
        width: Math.round(size * 1.85),
        height: Math.round(size * 1.55),
      }}
      aria-hidden
    >
      <Snowfall size={size} />

      <motion.div
        className="relative z-10"
        style={{ width: size, height: frameH, perspective: size * 5 }}
        animate={BREEZE_SWAY}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.18, 0.36, 0.54, 0.72, 0.88, 1],
        }}
      >
        {/* Ground shadow — scales with tilt for depth cue */}
        <motion.div
          className="pointer-events-none absolute bottom-0 left-1/2 h-[18%] w-[72%] -translate-x-1/2 rounded-[50%] bg-sky-300/15 blur-[6px]"
          animate={SHADOW}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.18, 0.35, 0.52, 0.68, 0.84, 1],
          }}
        />

        <motion.div
          className="absolute inset-x-0 top-0"
          style={{ height: size, transformStyle: "preserve-3d" }}
          animate={TUMBLE}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.16, 0.32, 0.5, 0.66, 0.82, 1],
          }}
        >
          {/* Ambient ice glow behind crystal */}
          <motion.div
            className="winter-arc-logo-glow absolute inset-[8%] rounded-full"
            style={{
              transform: `translateZ(${-depth}px)`,
              filter: "blur(10px)",
            }}
            animate={GLOW}
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.16, 0.32, 0.5, 0.66, 0.82, 1],
            }}
          />

          {/* Back facet — faint mirrored crystal */}
          <div
            className="absolute inset-[6%] opacity-[0.18]"
            style={{
              transform: `translateZ(${-depth * 0.6}px) rotateY(180deg)`,
              transformStyle: "preserve-3d",
            }}
          >
            <SnowflakeIcon />
          </div>

          {/* Orbital ring — subtle 3D halo */}
          <motion.div
            className="absolute inset-[4%] rounded-full border border-sky-200/20"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateX: [72, 88, 68, 82, 72], rotateZ: [0, 120, 240, 360] }}
            transition={{
              rotateX: { duration: 9, repeat: Infinity, ease: "easeInOut" },
              rotateZ: { duration: 18, repeat: Infinity, ease: "linear" },
            }}
          />

          {/* Front crystal face */}
          <motion.div
            className="winter-arc-logo-image absolute inset-0 flex items-center justify-center overflow-hidden rounded-full"
            style={{
              transform: `translateZ(${depth}px)`,
              transformStyle: "preserve-3d",
            }}
            animate={{ rotateZ: [0, -360] }}
            transition={{
              duration: 24,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <div className="relative h-[88%] w-[88%]">
              <SnowflakeIcon />
              {/* Specular sweep — ice catching light */}
              <motion.div
                className="winter-arc-logo-shimmer pointer-events-none absolute inset-0"
                animate={SHIMMER_SWEEP}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatDelay: 2.2,
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

import type { PosKind } from "@/core/domain/entities/Shift";

const SCREENS: { prefix: string; kind: PosKind }[] = [
  { prefix: "/cashier", kind: "BAR" },
  { prefix: "/counter-orders", kind: "BAR" },
  { prefix: "/waitlist", kind: "BAR" },
  { prefix: "/dining-tables", kind: "BAR" },
  { prefix: "/ktv", kind: "KTV" },
  { prefix: "/spa", kind: "SPA" },
];

const HOME: Record<PosKind, string> = { BAR: "/cashier", KTV: "/ktv", SPA: "/spa" };

/**
 * Where to send a POS device that is on a screen it does not sell at - a SPA
 * device opened on the restaurant till - or null when the screen is its own.
 */
export function hiddenPosScreen(pathname: string, sellsAt: PosKind[]): string | null {
  const screen = SCREENS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!screen || sellsAt.includes(screen.kind) || !sellsAt.length) return null;
  return HOME[sellsAt[0]];
}

const SEATING_ICON_PATHS = {
  move: ["m16 3 4 4-4 4", "M20 7H4", "m8 21-4-4 4-4", "M4 17h16"],
  chevron: ["m6 9 6 6 6-6"],
  split: [
    "M16 3h5v5",
    "M8 3H3v5",
    "M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3",
    "m15 9 6-6",
  ],
  merge: ["m8 6 4-4 4 4", "M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22", "m20 22-5-5"],
  options: [
    "M20 7h-9",
    "M14 17H5",
    "M17 14a3 3 0 1 0 0 6 3 3 0 1 0 0-6z",
    "M7 4a3 3 0 1 0 0 6 3 3 0 1 0 0-6z",
  ],
  minus: ["M5 12h14"],
  plus: ["M5 12h14", "M12 5v14"],
  edit: [
    "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
    "m15 5 4 4",
  ],
  remove: [
    "M3 6h18",
    "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",
    "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",
    "M10 11v6",
    "M14 11v6",
  ],
} as const;

export function SeatingIcon({
  name,
  className = "h-5 w-5",
}: {
  name: keyof typeof SEATING_ICON_PATHS;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {SEATING_ICON_PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

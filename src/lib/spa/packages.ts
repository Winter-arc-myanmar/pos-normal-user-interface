import type { SpaPackage } from "@/core/domain/entities/Spa";

/** How many of each package was chosen, by package id. */
export type PackageChoice = Record<string, number>;

export const changeChoice = (choice: PackageChoice, id: string, delta: number): PackageChoice => {
  const next = Math.max(0, (choice[id] || 0) + delta);
  const rest = Object.fromEntries(Object.entries(choice).filter(([key]) => key !== id));
  return next ? { ...rest, [id]: next } : rest;
};

export const chosenPackages = (choice: PackageChoice, packages: SpaPackage[]) =>
  packages
    .filter((item) => (choice[item.id] || 0) > 0)
    .map((item) => ({ package: item, quantity: choice[item.id] }));

export const packageOrders = (choice: PackageChoice, packages: SpaPackage[]) =>
  chosenPackages(choice, packages).map(({ package: item, quantity }) => ({
    packageId: item.id,
    quantity,
  }));

export const choiceTotals = (choice: PackageChoice, packages: SpaPackage[]) =>
  chosenPackages(choice, packages).reduce(
    (totals, { package: item, quantity }) => ({
      count: totals.count + quantity,
      minutes: totals.minutes + item.durationMinutes * quantity,
      price: totals.price + item.price * quantity,
    }),
    { count: 0, minutes: 0, price: 0 }
  );

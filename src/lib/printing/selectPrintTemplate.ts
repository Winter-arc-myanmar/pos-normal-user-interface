import {
  PRINT_TEMPLATE_TYPES,
  PrintTemplate,
  PrintTemplateSettings,
  PrintTemplateType,
} from "@/core/domain/entities/PrintTemplate";
import { PrintPlace } from "./formatKdsTicket";

export class PrintTemplateSelectionError extends Error {}

export function printPlaceToTemplateType(place: PrintPlace): PrintTemplateType {
  if (place === "KDS") return "KITCHEN";
  if (place === "FINANCE") return "FINANCE";
  return "RECEIPT";
}

export function templateTypeToPrintPlace(type: PrintTemplateType): PrintPlace {
  if (type === "KITCHEN") return "KDS";
  if (type === "FINANCE") return "FINANCE";
  return "CHECKOUT";
}

/**
 * The templates the server would print with: only defaults, this outlet's
 * before the all-outlets one. A saved template that is not a default is
 * never used, however it is set up.
 */
export function templatesForType(
  type: PrintTemplateType,
  templates: PrintTemplate[],
  locationId?: string
): PrintTemplate[] {
  const defaults = templates.filter(
    (template) =>
      template.type === type &&
      template.isDefault &&
      !template.deletedAt &&
      PRINT_TEMPLATE_TYPES.includes(template.type)
  );
  const own = locationId
    ? defaults.filter((template) => template.locationId === locationId)
    : [];
  return own.length ? own : defaults.filter((template) => !template.locationId);
}

export function templatesForPrintPlace(
  place: PrintPlace,
  templates: PrintTemplate[],
  locationId?: string
): PrintTemplate[] {
  return templatesForType(printPlaceToTemplateType(place), templates, locationId);
}

export function pickPrintTemplate(
  place: PrintPlace,
  templates: PrintTemplate[],
  locationId?: string
): PrintTemplate | undefined {
  const candidates = templatesForPrintPlace(place, templates, locationId);
  if (candidates.length > 1) {
    throw new PrintTemplateSelectionError(
      `Multiple ${place} templates are active. Keep only one default template for this print section.`
    );
  }
  return candidates[0];
}

/**
 * The template the outlet saved for a section, whether or not it is flagged as
 * the default one.
 *
 * A slip that falls back to the server's built-in layout prints the sizes the
 * server ships with, not the ones the shop set: the built-in kitchen layout
 * prints every item at double height, which reads as "the text size in Print
 * Template does nothing". So a saved template still has to win over the
 * built-in when nothing is flagged default, and when more than one is (the
 * strict picker refuses to choose there) the most recently updated one prints.
 *
 * The strict picker above stays the rule for deciding what the *server* would
 * print; this one only decides which saved sizes fill in when it answers with
 * its built-in layout.
 */
export function pickSavedPrintTemplate(
  place: PrintPlace,
  templates: PrintTemplate[],
  locationId?: string
): PrintTemplate | undefined {
  const defaulted = templatesForPrintPlace(place, templates, locationId);
  if (defaulted.length === 1) return defaulted[0];

  const active = templates.filter(
    (template) =>
      template.type === printPlaceToTemplateType(place) &&
      !template.deletedAt &&
      PRINT_TEMPLATE_TYPES.includes(template.type)
  );
  const own = locationId
    ? active.filter((template) => template.locationId === locationId)
    : [];
  const pool = own.length ? own : active.filter((template) => !template.locationId);
  if (!pool.length) return undefined;

  const flagged = pool.filter((template) => template.isDefault);
  return [...(flagged.length ? flagged : pool)].sort((left, right) =>
    String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""))
  )[0];
}

export function selectPrintTemplate(
  place: PrintPlace,
  templates: PrintTemplate[],
  locationId?: string
): PrintTemplateSettings | undefined {
  return pickPrintTemplate(place, templates, locationId)?.settings;
}

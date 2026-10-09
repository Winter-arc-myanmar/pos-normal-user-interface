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

export function selectPrintTemplate(
  place: PrintPlace,
  templates: PrintTemplate[],
  locationId?: string
): PrintTemplateSettings | undefined {
  return pickPrintTemplate(place, templates, locationId)?.settings;
}

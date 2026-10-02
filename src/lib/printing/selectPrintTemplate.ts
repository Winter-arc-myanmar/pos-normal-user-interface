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

const scopedTemplates = (
  place: PrintPlace,
  templates: PrintTemplate[],
  locationId?: string
) => {
  const type = printPlaceToTemplateType(place);
  const matching = templates.filter(
    (template) =>
      template.type === type &&
      !template.deletedAt &&
      PRINT_TEMPLATE_TYPES.includes(template.type)
  );
  const locationTemplates = locationId
    ? matching.filter((template) => template.locationId === locationId)
    : [];
  const scoped = locationTemplates.length
    ? locationTemplates
    : matching.filter((template) => !template.locationId);
  const defaults = scoped.filter((template) => template.isDefault);
  return defaults.length ? defaults : scoped;
};

export function templatesForPrintPlace(
  place: PrintPlace,
  templates: PrintTemplate[],
  locationId?: string
): PrintTemplate[] {
  return scopedTemplates(place, templates, locationId);
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

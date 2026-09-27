import { PrintTemplate, PrintTemplateSettings } from "@/core/domain/entities/PrintTemplate";
import { PrintPlace } from "./formatKdsTicket";

export class PrintTemplateSelectionError extends Error {}

const scopedTemplates = (
  place: PrintPlace,
  templates: PrintTemplate[],
  locationId?: string
) => {
  const type = place === "KDS" ? "KITCHEN" : "RECEIPT";
  const matching = templates.filter(
    (template) => template.type === type && !template.deletedAt
  );
  if (!locationId) return matching.filter((template) => !template.locationId);

  const locationTemplates = matching.filter(
    (template) => template.locationId === locationId
  );
  return locationTemplates.length
    ? locationTemplates
    : matching.filter((template) => !template.locationId);
};

export function templatesForPrintPlace(
  place: PrintPlace,
  templates: PrintTemplate[],
  locationId?: string
): PrintTemplate[] {
  const scoped = scopedTemplates(place, templates, locationId);
  return place === "FINANCE"
    ? scoped.filter((template) => !template.isDefault)
    : scoped.filter((template) => template.isDefault);
}

export function pickPrintTemplate(
  place: PrintPlace,
  templates: PrintTemplate[],
  locationId?: string
): PrintTemplate | undefined {
  const candidates = templatesForPrintPlace(place, templates, locationId);
  if (candidates.length > 1) {
    throw new PrintTemplateSelectionError(
      `Multiple ${place} templates are active. Keep only one active template for this print section.`
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

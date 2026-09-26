import { PrintTemplate, PrintTemplateSettings } from "@/core/domain/entities/PrintTemplate";
import { PrintPlace } from "./formatKdsTicket";

export function selectPrintTemplate(
  place: PrintPlace,
  templates: PrintTemplate[],
  locationId?: string
): PrintTemplateSettings | undefined {
  const type = place === "KDS" ? "KITCHEN" : "RECEIPT";
  const matching = templates.filter(
    (template) => template.type === type && !template.deletedAt
  );
  const scoped = locationId
    ? matching.filter(
        (template) => !template.locationId || template.locationId === locationId
      )
    : matching;
  const pool = scoped.length ? scoped : matching;
  if (!pool.length) return undefined;
  if (place === "FINANCE") {
    return pool.find((template) => !template.isDefault)?.settings;
  }
  return (pool.find((template) => template.isDefault) || pool[0]).settings;
}

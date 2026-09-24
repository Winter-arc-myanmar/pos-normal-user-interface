import {
  PrintPaperWidth,
  PrintTemplate,
  PrintTemplateSettings,
  PrintTemplateType,
} from "../../domain/entities/PrintTemplate";

export type {
  PrintPaperWidth,
  PrintTemplateSettings,
  PrintTemplateType,
} from "../../domain/entities/PrintTemplate";

export interface PrintTemplateFilterDTO {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  type?: PrintTemplateType;
}

export interface CreatePrintTemplateDTO {
  type: PrintTemplateType;
  name: string;
  locationId?: string;
  paperWidth?: PrintPaperWidth;
  isDefault?: boolean;
  settings?: PrintTemplateSettings;
}

export interface UpdatePrintTemplateDTO {
  name?: string;
  paperWidth?: PrintPaperWidth;
  isDefault?: boolean;
  settings?: PrintTemplateSettings;
}

export interface ResolvePrintTemplateDTO {
  type: PrintTemplateType;
  locationId?: string;
}

export interface PrintTemplateListDTO {
  templates: PrintTemplate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

import {
  CreatePrintTemplateDTO,
  PrintTemplateFilterDTO,
  PrintTemplateListDTO,
  ResolvePrintTemplateDTO,
  UpdatePrintTemplateDTO,
} from "../dtos/PrintTemplateDTO";
import { PrintTemplate } from "../../domain/entities/PrintTemplate";
import { IPrintTemplateRepository } from "../../domain/repositories/IPrintTemplateRepository";
import { IPrintTemplateService } from "../../domain/services/IPrintTemplateService";

const TYPES = new Set(["RECEIPT", "KITCHEN"]);

export class PrintTemplateService implements IPrintTemplateService {
  constructor(private readonly repository: IPrintTemplateRepository) {}

  list(params?: PrintTemplateFilterDTO): Promise<PrintTemplateListDTO> {
    return this.repository.list(params);
  }

  getById(id: string): Promise<PrintTemplate> {
    if (!id.trim()) throw new Error("Print template ID is required");
    return this.repository.getById(id);
  }

  resolve(params: ResolvePrintTemplateDTO): Promise<PrintTemplate> {
    if (!TYPES.has(params.type)) throw new Error("Print template type is required");
    return this.repository.resolve(params);
  }

  create(payload: CreatePrintTemplateDTO): Promise<PrintTemplate> {
    if (!payload.name.trim()) throw new Error("Print template name is required");
    if (!TYPES.has(payload.type)) throw new Error("Print template type is required");
    return this.repository.create({
      ...payload,
      name: payload.name.trim(),
    });
  }

  update(id: string, payload: UpdatePrintTemplateDTO): Promise<PrintTemplate> {
    if (!id.trim()) throw new Error("Print template ID is required");
    return this.repository.update(id, {
      ...payload,
      name: payload.name?.trim(),
    });
  }

  delete(id: string): Promise<PrintTemplate> {
    if (!id.trim()) throw new Error("Print template ID is required");
    return this.repository.delete(id);
  }
}

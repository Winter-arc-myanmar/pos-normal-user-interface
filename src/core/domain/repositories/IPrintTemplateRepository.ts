import {
  CreatePrintTemplateDTO,
  PrintTemplateFilterDTO,
  PrintTemplateListDTO,
  ResolvePrintTemplateDTO,
  UpdatePrintTemplateDTO,
} from "../../application/dtos/PrintTemplateDTO";
import { PrintTemplate } from "../entities/PrintTemplate";

export interface IPrintTemplateRepository {
  list(params?: PrintTemplateFilterDTO): Promise<PrintTemplateListDTO>;
  getById(id: string): Promise<PrintTemplate>;
  resolve(params: ResolvePrintTemplateDTO): Promise<PrintTemplate>;
  create(payload: CreatePrintTemplateDTO): Promise<PrintTemplate>;
  update(id: string, payload: UpdatePrintTemplateDTO): Promise<PrintTemplate>;
  delete(id: string): Promise<PrintTemplate>;
}

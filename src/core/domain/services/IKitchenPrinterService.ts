import {
  CreateKitchenPrinterDTO,
  KitchenPrinterFilterDTO,
  KitchenPrinterListDTO,
  UpdateKitchenPrinterDTO,
} from "../../application/dtos/KitchenPrinterDTO";
import { KitchenPrinter } from "../entities/KitchenPrinter";

export interface IKitchenPrinterService {
  list(params?: KitchenPrinterFilterDTO): Promise<KitchenPrinterListDTO>;
  getById(id: string): Promise<KitchenPrinter>;
  create(payload: CreateKitchenPrinterDTO): Promise<KitchenPrinter>;
  update(id: string, payload: UpdateKitchenPrinterDTO): Promise<KitchenPrinter>;
  delete(id: string): Promise<KitchenPrinter>;
  attachCategory(id: string, categoryId: string): Promise<void>;
  detachCategory(id: string, categoryId: string): Promise<void>;
}

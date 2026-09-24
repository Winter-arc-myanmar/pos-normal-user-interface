import {
  CreateKdsStationDTO,
  KdsStationFilterDTO,
  KdsStationListDTO,
  UpdateKdsStationDTO,
} from "../../application/dtos/KdsStationDTO";
import { KdsStation } from "../entities/KdsStation";

export interface IKdsStationService {
  list(params?: KdsStationFilterDTO): Promise<KdsStationListDTO>;
  getById(id: string): Promise<KdsStation>;
  create(payload: CreateKdsStationDTO): Promise<KdsStation>;
  update(id: string, payload: UpdateKdsStationDTO): Promise<KdsStation>;
  delete(id: string): Promise<KdsStation>;
}

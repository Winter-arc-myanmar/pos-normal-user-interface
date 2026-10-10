import { RoomOrderView } from "@/core/domain/entities/RoomTablet";
import { KitchenSlip } from "@/lib/printing/formatKdsTicket";

export const toTabletSlip = (order: RoomOrderView): KitchenSlip => ({
  title: `Room order ${order.orderNumber}`,
  place: `Room ${order.roomNumber}`,
  placeDetail: order.roomName && order.roomName !== order.roomNumber ? order.roomName : undefined,
  firedAt: order.createdAt,
  sentBy: order.source === "TABLET" ? order.deviceName || "Room tablet" : undefined,
  lines: order.items.map((item) => ({
    name: item.name,
    quantity: String(item.quantity),
  })),
});

/** A hostess or dancer called to KTV rooms, as the till picks her. */
export interface Hostess {
  id: string;
  name: string;
  nickname: string | null;
  /** The room she is in now. Shown, not enforced: she can still be picked. */
  inRoom: { roomNumber: string; until: string | null } | null;
}

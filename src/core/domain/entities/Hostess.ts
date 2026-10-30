/** A hostess or dancer called to KTV rooms, as the till picks her. */
export interface Hostess {
  id: string;
  name: string;
  nickname: string | null;
  /** The room she is in now. Shown, not enforced: she can still be picked. */
  inRoom: {
    roomNumber: string;
    roomId?: string;
    /** When she went in: her latest service there. */
    since?: string;
    /** When her paid time ends; null for a service sold each, which lasts until the room closes. */
    until: string | null;
  } | null;
}

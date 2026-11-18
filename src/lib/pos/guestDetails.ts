/** The guest's details a slip prints when the food is not eaten at a table. */
export interface GuestDetails {
  name: string;
  location: string;
  time: string;
  phone: string;
}

export const EMPTY_GUEST_DETAILS: GuestDetails = {
  name: "",
  location: "",
  time: "",
  phone: "",
};

/** Sales the guest collects, takes away or has delivered, not eaten at a table. */
const AWAY_SERVICE_TYPES = ["TAKE_AWAY", "DELIVERY", "PICK_UP"];

export const asksGuestDetails = (serviceType?: string | null) =>
  AWAY_SERVICE_TYPES.includes(String(serviceType || "").toUpperCase());

/**
 * The rows the cashier's slip prints for the details that were filled in.
 * A box left empty is left off the slip; all four are optional.
 */
export const guestDetailRows = (
  details: GuestDetails | null | undefined,
  labels: Record<keyof GuestDetails, string>
): Array<{ label: string; value: string }> =>
  details
    ? (["name", "location", "time", "phone"] as const)
        .map((key) => ({ label: labels[key], value: details[key].trim() }))
        .filter((row) => row.value)
    : [];

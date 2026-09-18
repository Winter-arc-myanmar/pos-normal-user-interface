export const TIP_POOL_ROLE = "SERVER";
export const TIP_POOL_DISTRIBUTION_METHOD = "BY_HOURS";

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TipPoolAllocationForm = {
  userId: string;
  role: string;
  hoursWorked: string;
  weight: string;
  amount: string;
  notes: string;
};

export type TipPoolAllocationField = keyof TipPoolAllocationForm;

export type TipPoolAllocationFieldErrors = Partial<
  Record<TipPoolAllocationField | "form", string>
>;

export function isUuid(value: string): boolean {
  return UUID_LIKE.test(String(value || "").trim());
}

export function parseAllocationNumber(value: string): number | undefined {
  const trimmed = String(value || "").trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function validateTipPoolAllocationForm(
  form: TipPoolAllocationForm
): {
  errors: TipPoolAllocationFieldErrors;
  payload?: {
    userId: string;
    role: string;
    hoursWorked?: number;
    weight?: number;
    amount?: number;
    notes?: string | null;
  };
} {
  const errors: TipPoolAllocationFieldErrors = {};

  if (!isUuid(form.userId)) {
    errors.userId = "staffRequired";
  }
  if (!String(form.role || "").trim()) {
    errors.role = "roleRequired";
  }

  const hoursWorked = parseAllocationNumber(form.hoursWorked);
  const weight = parseAllocationNumber(form.weight);
  const amount = parseAllocationNumber(form.amount);

  if (Number.isNaN(hoursWorked)) errors.hoursWorked = "invalidNumber";
  if (Number.isNaN(weight)) errors.weight = "invalidNumber";
  if (Number.isNaN(amount)) errors.amount = "invalidNumber";

  const numbers = [hoursWorked, weight, amount].filter(
    (value): value is number => value !== undefined && Number.isFinite(value)
  );
  if (numbers.some((value) => value < 0)) {
    errors.form = "invalidNumber";
  } else if (!numbers.some((value) => value > 0)) {
    errors.form = "valueRequired";
  }

  if (Object.keys(errors).length) {
    return { errors };
  }

  return {
    errors,
    payload: {
      userId: form.userId.trim(),
      role: form.role.trim(),
      hoursWorked,
      weight,
      amount,
      notes: form.notes.trim() || null,
    },
  };
}

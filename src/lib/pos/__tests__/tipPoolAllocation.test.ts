import { describe, expect, it } from "vitest";
import { validateTipPoolAllocationForm } from "../tipPoolAllocation";

const validForm = {
  userId: "11111111-1111-4111-8111-111111111111",
  role: "SERVER",
  hoursWorked: "8",
  weight: "1",
  amount: "0",
  notes: "",
};

describe("tipPoolAllocation", () => {
  it("rejects free-text staff and numeric fields before submit", () => {
    const result = validateTipPoolAllocationForm({
      userId: "IDK",
      role: "IDK",
      hoursWorked: "IDK",
      weight: "IDK",
      amount: "IDK",
      notes: "",
    });

    expect(result.payload).toBeUndefined();
    expect(result.errors.userId).toBe("staffRequired");
    expect(result.errors.hoursWorked).toBe("invalidNumber");
    expect(result.errors.weight).toBe("invalidNumber");
    expect(result.errors.amount).toBe("invalidNumber");
  });

  it("builds the documented allocation payload", () => {
    const result = validateTipPoolAllocationForm(validForm);
    expect(result.errors).toEqual({});
    expect(result.payload).toEqual({
      userId: validForm.userId,
      role: "SERVER",
      hoursWorked: 8,
      weight: 1,
      amount: 0,
      notes: null,
    });
  });
});

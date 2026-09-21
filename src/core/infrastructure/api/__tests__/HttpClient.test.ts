import { describe, expect, it } from "vitest";
import type { AxiosError } from "axios";
import { applyAxiosErrorMessage } from "../HttpClient";

describe("applyAxiosErrorMessage", () => {
  it("replaces raw 429 axios text with a retry message", () => {
    const error = {
      isAxiosError: true,
      message: "Request failed with status code 429",
      response: { status: 429, data: {} },
    } as AxiosError;

    applyAxiosErrorMessage(error);

    expect(error.message).toBe(
      "Too many requests. Wait a moment and try again."
    );
  });

  it("hides Nest ThrottlerException text on 429", () => {
    const error = {
      isAxiosError: true,
      message: "Request failed with status code 429",
      response: {
        status: 429,
        data: { message: "ThrottlerException: Too Many Requests" },
      },
    } as AxiosError;

    applyAxiosErrorMessage(error);

    expect(error.message).toBe(
      "Too many requests. Wait a moment and try again."
    );
  });

  it("uses the API message when present", () => {
    const error = {
      isAxiosError: true,
      message: "Request failed with status code 400",
      response: { status: 400, data: { message: "Order is not fireable" } },
    } as AxiosError;

    applyAxiosErrorMessage(error);

    expect(error.message).toBe("Order is not fireable");
  });

  it("joins array API validation messages instead of raw status 400 text", () => {
    const error = {
      isAxiosError: true,
      message: "Request failed with status code 400",
      response: {
        status: 400,
        data: {
          error: "Bad Request",
          message: ["userId must be a UUID", "hoursWorked must be a number"],
        },
      },
    } as AxiosError;

    applyAxiosErrorMessage(error);

    expect(error.message).toBe(
      "userId must be a UUID. hoursWorked must be a number"
    );
  });
});

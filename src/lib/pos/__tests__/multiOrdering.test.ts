import { beforeEach, describe, expect, it } from "vitest";
import {
  clearTableOrderIds,
  mergeTableOrderIds,
  readTableOrderIds,
  writeTableOrderIds,
} from "../multiOrdering";

describe("multiOrdering", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("stores unique order IDs per table", () => {
    writeTableOrderIds("table-1", ["order-1", "order-2", "order-1"]);

    expect(readTableOrderIds("table-1")).toEqual(["order-1", "order-2"]);
  });

  it("merges additional IDs while preserving the primary order", () => {
    writeTableOrderIds("table-1", ["order-2"]);

    expect(
      mergeTableOrderIds("table-1", "order-1", ["order-3", "order-2"])
    ).toEqual(["order-1", "order-2", "order-3"]);
  });

  it("clears only the requested table", () => {
    writeTableOrderIds("table-1", ["order-1"]);
    writeTableOrderIds("table-2", ["order-2"]);

    clearTableOrderIds("table-1");

    expect(readTableOrderIds("table-1")).toEqual([]);
    expect(readTableOrderIds("table-2")).toEqual(["order-2"]);
  });
});

import { describe, expect, it } from "vitest";
import { resolveMediaUrl } from "../constants";

describe("resolveMediaUrl", () => {
  it("prefixes API origin for relative upload paths", () => {
    const resolved = resolveMediaUrl(
      "/uploads/system/main/products/images__2_-1776865548761-381140850.jpg"
    );
    expect(resolved).toMatch(/^https?:\/\//);
    expect(resolved).toContain(
      "/uploads/system/main/products/images__2_-1776865548761-381140850.jpg"
    );
  });

  it("keeps absolute and empty values", () => {
    expect(resolveMediaUrl("https://cdn.example.com/coffee.jpg")).toBe(
      "https://cdn.example.com/coffee.jpg"
    );
    expect(resolveMediaUrl(null)).toBeUndefined();
  });
});

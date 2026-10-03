import { expect, it } from "vitest";
import { validContactEmail } from "./email";

it("accepts common authentic email addresses", () => {
  expect(validContactEmail("alex@example.com")).toBe(true);
  expect(validContactEmail("alex@school.edu")).toBe(true);
  expect(validContactEmail("info@agency.gov")).toBe(true);
  expect(validContactEmail("hello@studio.io")).toBe(true);
  expect(validContactEmail("team@brand.co.uk")).toBe(true);
  expect(validContactEmail(" alex@example.test ")).toBe(true);
});

it("rejects missing pieces and common typo domains", () => {
  expect(validContactEmail("")).toBe(false);
  expect(validContactEmail("alex")).toBe(false);
  expect(validContactEmail("alex@")).toBe(false);
  expect(validContactEmail("@example.com")).toBe(false);
  expect(validContactEmail("alex@example")).toBe(false);
  expect(validContactEmail("alex@example.con")).toBe(false);
  expect(validContactEmail("alex@example.cpm")).toBe(false);
  expect(validContactEmail("alex@example.vom")).toBe(false);
  expect(validContactEmail("alex@@example.com")).toBe(false);
  expect(validContactEmail("alex@ex ample.com")).toBe(false);
});

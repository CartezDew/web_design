import { describe, expect, it } from "vitest";
import { FILE_LIMITS, validateFiles } from "./FilePicker";

const pdf = (name, size = 100) => ({ name, size, type: "application/pdf" });

describe("project attachment limits", () => {
  it("counts already stored files with the current selection", () => {
    const stored = Array.from({ length: 11 }, (_, i) => pdf(`${i}.pdf`));
    const result = validateFiles(
      [pdf("new.pdf"), pdf("extra.pdf")],
      [],
      stored,
    );
    expect(result.accepted).toHaveLength(1);
    expect(result.errors[0]).toContain("12 files");
  });

  it("accepts the exact byte limits and rejects one byte more", () => {
    const stored = Array.from({ length: 4 }, (_, i) =>
      pdf(`${i}.pdf`, FILE_LIMITS.each),
    );
    const result = validateFiles(
      [pdf("last.pdf", FILE_LIMITS.each), pdf("extra.pdf", 1)],
      [],
      stored,
    );
    expect(result.accepted).toHaveLength(1);
    expect(result.errors[0]).toContain("25 MB");
    expect(
      validateFiles([pdf("large.pdf", FILE_LIMITS.each + 1)]).accepted,
    ).toHaveLength(0);
  });

  it("rejects empty, mismatched and unsupported files without dropping valid files", () => {
    const result = validateFiles([
      pdf("empty.pdf", 0),
      pdf("executable.exe"),
      { name: "image.png", type: "application/pdf", size: 100 },
      pdf("valid.pdf"),
    ]);
    expect(result.accepted.map((file) => file.name)).toEqual(["valid.pdf"]);
    expect(result.errors).toHaveLength(3);
  });

  it("does not add the same file twice", () => {
    expect(
      validateFiles([pdf("same.pdf"), pdf("same.pdf")]).accepted,
    ).toHaveLength(1);
  });
});

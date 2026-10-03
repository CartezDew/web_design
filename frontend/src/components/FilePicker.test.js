import { describe, expect, it } from "vitest";
import { FILE_LIMITS, validateFiles } from "./FilePicker";
import { uploadContentType } from "../content/uploads";

const pdf = (name, size = 100) => ({ name, size, type: "application/pdf" });

describe("project attachment limits", () => {
  it.each([
    ["jpg", "image/jpeg"],
    ["jpeg", "image/jpeg"],
    ["png", "image/png"],
    ["webp", "image/webp"],
    ["gif", "image/gif"],
    ["avif", "image/avif"],
    ["bmp", "image/bmp"],
    ["tif", "image/tiff"],
    ["tiff", "image/tiff"],
    ["pdf", "application/pdf"],
  ])(
    "accepts %s with a matching, missing, or generic MIME type",
    (extension, type) => {
      for (const reportedType of [type, "", "application/octet-stream"]) {
        const file = {
          name: `reference.${extension.toUpperCase()}`,
          type: reportedType,
          size: 100,
        };
        expect(validateFiles([file]).accepted).toEqual([file]);
        expect(uploadContentType(file)).toBe(type);
      }
    },
  );

  it("normalizes OS image aliases and rejects other images and document formats", () => {
    expect(
      uploadContentType({ name: "photo.bmp", type: "image/x-ms-bmp" }),
    ).toBe("image/bmp");
    expect(uploadContentType({ name: "photo.tif", type: "image/x-tiff" })).toBe(
      "image/tiff",
    );
    for (const name of [
      "image.svg",
      "image.heic",
      "file.docx",
      "file.zip",
      "file.exe",
    ]) {
      expect(
        validateFiles([{ name, type: "", size: 100 }]).accepted,
      ).toHaveLength(0);
    }
  });
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

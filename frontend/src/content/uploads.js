// Keep the picker and signed-upload request on the same explicit allowlist.
export const FILE_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  pdf: "application/pdf",
};
export const FILE_FORMAT_LABEL =
  "JPG/JPEG, PNG, WebP, GIF, AVIF, BMP, TIFF, or PDF";
export const FILE_ACCEPT = [
  ...Object.keys(FILE_TYPES).map((extension) => `.${extension}`),
  ...new Set(Object.values(FILE_TYPES)),
].join(",");

export function uploadContentType(file) {
  const expected = FILE_TYPES[file.name.split(".").pop().toLowerCase()];
  const actual = file.type?.toLowerCase();
  // Some operating systems report BMP/TIFF aliases or no useful MIME type.
  // The server still checks the actual bytes before accepting the file.
  const aliases = {
    "image/x-ms-bmp": "image/bmp",
    "image/x-bmp": "image/bmp",
    "image/x-tiff": "image/tiff",
  };
  return expected &&
    (!actual ||
      actual === "application/octet-stream" ||
      (aliases[actual] || actual) === expected)
    ? expected
    : null;
}

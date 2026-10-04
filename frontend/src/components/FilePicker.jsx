import { useEffect, useState } from "react";
import { FileText, Upload, X, Check } from "lucide-react";
import {
  FILE_ACCEPT,
  FILE_FORMAT_LABEL,
  uploadContentType,
} from "../content/uploads";
import "./FilePicker.css";
// Small files read as KB so a logo doesn't show as "0.00 MB".
function fileSize(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const FILE_LIMITS = {
  count: 12,
  each: 5 * 1024 * 1024,
  total: 25 * 1024 * 1024,
};
export function validateFiles(
  incoming,
  current = [],
  existing = [],
  imagesOnly = false,
) {
  const accepted = [];
  const errors = [];
  let total = [...current.map((i) => i.file), ...existing].reduce(
    (sum, f) => sum + f.size,
    0,
  );
  for (const file of incoming) {
    if (
      current.some(
        (i) => i.file.name === file.name && i.file.size === file.size,
      ) ||
      accepted.some((i) => i.name === file.name && i.size === file.size)
    )
      continue;
    const type = uploadContentType(file);
    if (!type) {
      errors.push(
        `${file.name}: choose ${FILE_FORMAT_LABEL}. Images and PDF files only.`,
      );
      continue;
    }
    if (imagesOnly && !type.startsWith("image/")) {
      errors.push(
        `${file.name}: add photos here; PDFs go in the section below.`,
      );
      continue;
    }
    if (file.size <= 0 || file.size > FILE_LIMITS.each) {
      errors.push(`${file.name}: use a nonempty file no larger than 5 MB.`);
      continue;
    }
    if (
      current.length + existing.length + accepted.length >=
      FILE_LIMITS.count
    ) {
      errors.push("You can include up to 12 files in this project.");
      continue;
    }
    if (total + file.size > FILE_LIMITS.total) {
      errors.push("The combined files must be 25 MB or smaller.");
      continue;
    }
    accepted.push(file);
    total += file.size;
  }
  return { accepted, errors };
}
function Preview({ file }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    setUrl("");
    const type = uploadContentType(file);
    // TIFF uploads are valid, but most browsers cannot render a thumbnail.
    if (!type?.startsWith("image/") || type === "image/tiff") return;
    const value = URL.createObjectURL(file);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [file]);
  return url && !failed ? (
    <img src={url} alt="" onError={() => setFailed(true)} />
  ) : (
    <FileText size={23} />
  );
}
export default function FilePicker({
  items,
  onChange,
  onRemove,
  existing = [],
  disabled = false,
  imagesOnly = false,
  title = "Drop your files here, or browse",
  inputLabel = "Add images, screenshots, or PDFs",
}) {
  const [errors, setErrors] = useState([]);
  const [dragging, setDragging] = useState(false);
  const add = (files) => {
    if (disabled) return;
    const { accepted, errors } = validateFiles(
      Array.from(files),
      items,
      existing,
      imagesOnly,
    );
    setErrors(errors);
    onChange([
      ...items,
      ...accepted.map((file) => ({
        file,
        key: crypto.randomUUID(),
        progress: 0,
        status: "ready",
      })),
    ]);
  };
  const total = [...items.map((i) => i.file), ...existing].reduce(
    (sum, f) => sum + f.size,
    0,
  );
  return (
    <div className="file-picker">
      <label
        className={`file-drop${dragging ? " is-dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
      >
        <input
          className="sr-only"
          type="file"
          aria-label={inputLabel}
          multiple
          accept={
            imagesOnly
              ? FILE_ACCEPT.split(",")
                  .filter((type) => !/pdf/.test(type))
                  .join(",")
              : FILE_ACCEPT
          }
          disabled={disabled}
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload size={23} />
        <strong>{title}</strong>
        {imagesOnly ? (
          <span>JPG, PNG, WebP, GIF, AVIF, BMP, or TIFF</span>
        ) : (
          <>
            <span>Images and PDF files only</span>
            <span>{FILE_FORMAT_LABEL}</span>
          </>
        )}
        <small>Up to 12 files · 5 MB each · 25 MB total</small>
        {!imagesOnly && <small>PDFs must open without a password.</small>}
      </label>
      <p className="file-usage">
        {items.length + existing.length} of 12 files ·{" "}
        {(total / 1024 / 1024).toFixed(1)} of 25 MB
      </p>
      {errors.length > 0 && (
        <div className="notice notice--error" role="alert">
          {errors.map((error, i) => (
            <p key={i}>{error}</p>
          ))}
        </div>
      )}
      <ul className="file-list">
        {items.map((item) => (
          <li key={item.key}>
            <div className="file-preview">
              <Preview file={item.file} />
            </div>
            <div className="file-info">
              <strong>{item.file.name}</strong>
              <small>
                {fileSize(item.file.size)} ·{" "}
                {item.status === "done"
                  ? "Uploaded"
                  : item.status === "uploading"
                    ? `${item.progress}%`
                    : "Ready to upload"}
              </small>
              {item.status === "uploading" && (
                <progress
                  aria-label={`Uploading ${item.file.name}`}
                  value={item.progress}
                  max="100"
                />
              )}
              {item.error && (
                <span className="field-error" role="alert">
                  {item.error}
                </span>
              )}
            </div>
            {item.status === "done" ? <Check size={18} /> : null}
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onRemove
                  ? onRemove(item)
                  : onChange(items.filter((i) => i.key !== item.key))
              }
              aria-label={`Remove ${item.file.name}`}
            >
              <X size={16} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

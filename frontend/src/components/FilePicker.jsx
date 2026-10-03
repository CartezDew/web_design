import { useEffect, useState } from "react";
import { FileText, Upload, X, Check } from "lucide-react";
import "./FilePicker.css";
export const FILE_LIMITS = {
  count: 12,
  each: 5 * 1024 * 1024,
  total: 25 * 1024 * 1024,
};
const types = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};
export function validateFiles(incoming, current = [], existing = []) {
  const accepted = [];
  const errors = [];
  let total = [...current.map((i) => i.file), ...existing].reduce(
    (sum, f) => sum + f.size,
    0,
  );
  for (const file of incoming) {
    const ext = file.name.split(".").pop().toLowerCase();
    if (
      current.some(
        (i) => i.file.name === file.name && i.file.size === file.size,
      ) ||
      accepted.some((i) => i.name === file.name && i.size === file.size)
    )
      continue;
    if (!types[ext] || (file.type && types[ext] !== file.type)) {
      errors.push(`${file.name}: choose JPG, PNG, WebP, or PDF.`);
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
  useEffect(() => {
    if (!file.type.startsWith("image/")) return;
    const value = URL.createObjectURL(file);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [file]);
  return url ? <img src={url} alt="" /> : <FileText size={23} />;
}
export default function FilePicker({
  items,
  onChange,
  onRemove,
  existing = [],
  disabled = false,
}) {
  const [errors, setErrors] = useState([]);
  const [dragging, setDragging] = useState(false);
  const add = (files) => {
    if (disabled) return;
    const { accepted, errors } = validateFiles(
      Array.from(files),
      items,
      existing,
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
          aria-label="Add images, screenshots, or PDFs"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          disabled={disabled}
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload size={23} />
        <strong>Drop your files here, or browse</strong>
        <span>JPG, PNG, WebP, and PDF</span>
        <small>Up to 12 files · 5 MB each · 25 MB total</small>
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
                {(item.file.size / 1024 / 1024).toFixed(2)} MB ·{" "}
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

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAriaControls } from "./ariaControls";
import "./Controls.css";
export function Field({ label, hint, error, multiline = false, ...props }) {
  const Element = multiline ? "textarea" : "input";
  const id = useId();
  const describedBy = [
    hint && `${id}-hint`,
    error && `${id}-error`,
    props["aria-describedby"],
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <label className="field">
      <span id={`${id}-label`}>
        {label}
        {props.required && <span aria-hidden="true"> *</span>}
      </span>
      <Element
        {...props}
        aria-labelledby={props["aria-labelledby"] || `${id}-label`}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy || undefined}
      />
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && (
        <small id={`${id}-error`} className="field-error">
          {error}
        </small>
      )}
    </label>
  );
}
// While a native stand-in has focus, keep it on screen so the upgrade to the
// React Aria widget never yanks a control out from under the visitor.
function useUpgrade() {
  const aria = useAriaControls();
  const [busy, setBusy] = useState(false);
  const hold = {
    onFocus: () => setBusy(true),
    onBlur: () => setBusy(false),
  };
  return [busy ? null : aria, hold];
}

function optionItem(option) {
  return typeof option === "string" ? { value: option, label: option } : option;
}

export function CustomSelect(props) {
  const [aria, hold] = useUpgrade();
  const id = useId();
  if (aria) return <aria.CustomSelect {...props} />;
  const {
    label,
    value,
    onChange,
    options,
    placeholder = "Choose an option",
    required = false,
    disabled = false,
    name,
  } = props;
  return (
    <div className="custom-select">
      {/* A span, like React Aria's label, so both versions pick up the same styles. */}
      <span id={`${id}-label`}>{label}</span>
      <div className="native-select">
        <select
          {...hold}
          aria-labelledby={`${id}-label`}
          className="select-trigger"
          name={name}
          value={value || ""}
          required={required}
          disabled={disabled}
          data-placeholder={value ? undefined : ""}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map(optionItem).map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} aria-hidden="true" />
      </div>
    </div>
  );
}

export function ChoiceGroup(props) {
  const [aria, hold] = useUpgrade();
  const id = useId();
  if (aria) return <aria.ChoiceGroup {...props} />;
  const { label, value, onChange, options } = props;
  return (
    <div
      className="choice-group"
      role="radiogroup"
      aria-labelledby={`${id}-label`}
    >
      <span id={`${id}-label`}>{label}</span>
      <div className="choices">
        {options.map((option) => (
          <label
            className="choice"
            key={option}
            data-selected={value === option || undefined}
          >
            <input
              {...hold}
              className="sr-only"
              type="radio"
              name={id}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            <span className="choice-dot" />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}

export function CustomDatePicker(props) {
  const [aria, hold] = useUpgrade();
  const id = useId();
  if (aria) return <aria.CustomDatePicker {...props} />;
  const { label, value, onChange, min } = props;
  return (
    <div className="custom-date-picker">
      <span id={`${id}-label`}>{label}</span>
      <input
        {...hold}
        aria-labelledby={`${id}-label`}
        className="date-trigger native-date"
        type="date"
        value={value || ""}
        min={min}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function Notice({ error, success }) {
  return error || success ? (
    <div
      className={`notice${error ? " notice--error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {error || success}
    </div>
  ) : null;
}

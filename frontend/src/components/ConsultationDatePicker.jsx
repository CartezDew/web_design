import { useId, useRef, useState } from "react";
import { CalendarDays, Check } from "lucide-react";
import { isoDateToUtc } from "../content/dates";
import { loadAriaControls, useAriaControls } from "./ariaControls";
import "./ConsultationDatePicker.css";

export default function ConsultationDatePicker({
  value,
  onChange,
  disabled,
  ...props
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef(null);
  // The calendar only renders once opened, so its React Aria chunk can wait.
  const aria = useAriaControls();
  const preload = () => loadAriaControls().catch(() => {});
  const selectedLabel = value
    ? new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(isoDateToUtc(value))
    : "Choose a date that works for you";
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <div
      className="consultation-date-picker"
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className={`consultation-date-trigger${value ? " has-value" : ""}`}
        aria-expanded={open}
        aria-controls={id}
        disabled={disabled}
        onPointerEnter={preload}
        onFocus={preload}
        onClick={() => {
          preload();
          setOpen((current) => !current);
        }}
      >
        <span key={value || "empty"}>
          <small>{value ? "Your consultation date" : "Choose a date"}</small>
          <strong>{selectedLabel}</strong>
        </span>
        {value ? (
          <Check size={20} aria-hidden="true" />
        ) : (
          <CalendarDays size={20} aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="consultation-calendar-panel" id={id}>
          {aria ? (
            <aria.CustomCalendar
              {...props}
              consultation
              value={value}
              onChange={(date) => {
                onChange(date);
                close();
              }}
            />
          ) : (
            <p className="form-help" role="status">
              Loading the calendar…
            </p>
          )}
          <p className="calendar-help">
            Dates with a red dot have open times. Choose a date, then pick a
            time below.
          </p>
        </div>
      )}
    </div>
  );
}

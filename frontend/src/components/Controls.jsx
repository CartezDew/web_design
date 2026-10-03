import { useId } from "react";
import {
  Button,
  Select,
  SelectValue,
  Label,
  Popover,
  ListBox,
  ListBoxItem,
  Calendar,
  CalendarGrid,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarGridBody,
  CalendarCell,
  Heading,
  DatePicker,
  DateInput,
  DateSegment,
  Group,
  Dialog,
  RadioGroup,
  Radio,
} from "react-aria-components";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { parseDate } from "@internationalized/date";
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
export function CustomSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Choose an option",
  required = false,
  disabled = false,
  name,
}) {
  return (
    <Select
      className="custom-select"
      name={name}
      selectedKey={value || null}
      onSelectionChange={(key) => onChange(String(key))}
      isRequired={required}
      isDisabled={disabled}
      placeholder={placeholder}
    >
      <Label>{label}</Label>
      <Button className="select-trigger">
        <SelectValue />
        <ChevronDown size={16} />
      </Button>
      <Popover className="select-popover">
        <ListBox className="select-list">
          {options.map((option) => {
            const item =
              typeof option === "string"
                ? { value: option, label: option }
                : option;
            return (
              <ListBoxItem
                className="select-item"
                key={item.value}
                id={item.value}
                textValue={item.label}
              >
                {({ isSelected }) => (
                  <>
                    <span>{item.label}</span>
                    {isSelected && <Check size={15} />}
                  </>
                )}
              </ListBoxItem>
            );
          })}
        </ListBox>
      </Popover>
    </Select>
  );
}
export function ChoiceGroup({ label, value, onChange, options }) {
  return (
    <RadioGroup className="choice-group" value={value} onChange={onChange}>
      <Label>{label}</Label>
      <div className="choices">
        {options.map((option) => (
          <Radio className="choice" key={option} value={option}>
            <span className="choice-dot" />
            {option}
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}
export function CalendarBody({ consultation = false }) {
  return (
    <>
      <header className="calendar-header">
        <div className="calendar-month">
          {consultation && <span>Let’s find a time</span>}
          <Heading />
        </div>
        <div>
          <Button slot="previous" aria-label="Previous month">
            <ChevronLeft size={18} />
          </Button>
          <Button slot="next" aria-label="Next month">
            <ChevronRight size={18} />
          </Button>
        </div>
      </header>
      <CalendarGrid className="calendar-grid">
        <CalendarGridHeader>
          {(day) => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
        </CalendarGridHeader>
        <CalendarGridBody>
          {(date) => (
            <CalendarCell className="calendar-cell" date={date}>
              {({ formattedDate, isToday, isDisabled, isUnavailable }) => (
                <>
                  <span>{formattedDate}</span>
                  {consultation && isToday && <i aria-hidden="true">Today</i>}
                  {consultation &&
                    !isToday &&
                    !isDisabled &&
                    !isUnavailable && (
                      <i
                        className="calendar-available-dot"
                        aria-hidden="true"
                      />
                    )}
                </>
              )}
            </CalendarCell>
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </>
  );
}
export function CustomCalendar({
  value,
  onChange,
  min,
  max,
  isDateUnavailable,
  consultation = false,
}) {
  return (
    <Calendar
      aria-label="Choose a consultation date"
      className={
        consultation
          ? "custom-calendar consultation-calendar"
          : "custom-calendar"
      }
      value={value ? parseDate(value) : null}
      onChange={(date) => onChange(date.toString())}
      minValue={min ? parseDate(min) : undefined}
      maxValue={max ? parseDate(max) : undefined}
      isDateUnavailable={isDateUnavailable}
    >
      <CalendarBody consultation={consultation} />
    </Calendar>
  );
}
export function CustomDatePicker({ label, value, onChange, min }) {
  return (
    <DatePicker
      className="custom-date-picker"
      value={value ? parseDate(value) : null}
      onChange={(date) => onChange(date?.toString() || "")}
      minValue={min ? parseDate(min) : undefined}
    >
      <Label>{label}</Label>
      <Group className="date-trigger">
        <DateInput>{(segment) => <DateSegment segment={segment} />}</DateInput>
        <Button aria-label="Open calendar">
          <CalendarDays size={18} />
        </Button>
      </Group>
      <Popover className="calendar-popover">
        <Dialog>
          <Calendar className="custom-calendar">
            <CalendarBody />
          </Calendar>
        </Dialog>
      </Popover>
    </DatePicker>
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

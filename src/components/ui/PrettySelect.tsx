"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export type PrettySelectOption = {
  label: string;
  value: string;
};

type Props = {
  name: string;
  label: string;
  options: PrettySelectOption[];
  defaultValue?: string;
  /** Controlled value. When provided, the component is controlled and `onChange` is called on selection. */
  value?: string;
  onChange?: (value: string) => void;
  /** Shown in the trigger while no option is selected (instead of falling back to the first option). */
  placeholder?: string;
  /** Visually hide the field label (still exposed to assistive tech via aria-label on the trigger). */
  hideLabel?: boolean;
};

export function PrettySelect({
  name,
  label,
  options,
  defaultValue = "",
  value,
  onChange,
  placeholder,
  hideLabel = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const rootRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;
  const matched = options.find((option) => option.value === currentValue);
  const selected = matched ?? (placeholder !== undefined ? undefined : options[0]);
  const triggerLabel = selected?.label ?? placeholder ?? "Выбрать";

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function choose(optionValue: string) {
    if (!isControlled) setInternalValue(optionValue);
    onChange?.(optionValue);
    setOpen(false);
  }

  return (
    <label className="pretty-select-field">
      {hideLabel ? null : <span>{label}</span>}
      <input type="hidden" name={name} value={selected?.value ?? currentValue ?? ""} />
      <div className="pretty-select" ref={rootRef}>
        <button
          aria-controls={id}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={hideLabel ? label : undefined}
          className={`pretty-select-trigger ${open ? "open" : ""}${selected ? "" : " is-placeholder"}`}
          type="button"
          onClick={() => setOpen((current) => !current)}
        >
          <strong>{triggerLabel}</strong>
          <ChevronDown size={16} aria-hidden />
        </button>
        {open ? (
          <div className="pretty-select-menu" id={id} role="listbox" aria-label={label}>
            {options.map((option) => {
              const isSelected = option.value === selected?.value;
              return (
                <button
                  aria-selected={isSelected}
                  className={`pretty-select-option ${isSelected ? "selected" : ""}`}
                  key={option.value || "empty"}
                  role="option"
                  type="button"
                  onClick={() => choose(option.value)}
                >
                  <span className="filter-radio-dot" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </label>
  );
}

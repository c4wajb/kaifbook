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
};

export function PrettySelect({ name, label, options, defaultValue = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const rootRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

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

  return (
    <label className="pretty-select-field">
      <span>{label}</span>
      <input type="hidden" name={name} value={selected?.value ?? ""} />
      <div className="pretty-select" ref={rootRef}>
        <button
          aria-controls={id}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={`pretty-select-trigger ${open ? "open" : ""}`}
          type="button"
          onClick={() => setOpen((current) => !current)}
        >
          <strong>{selected?.label ?? "Выбрать"}</strong>
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
                  onClick={() => {
                    setValue(option.value);
                    setOpen(false);
                  }}
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

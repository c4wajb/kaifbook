"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";

type Props = {
  minName: string;
  maxName: string;
  minLabel: string;
  maxLabel: string;
  minDefaultValue?: number | string | null;
  maxDefaultValue?: number | string | null;
  minFieldMin?: number;
  maxFieldMin?: number;
  step?: number;
  required?: boolean;
  maxPlaceholder?: string;
  message?: string;
};

const toValue = (value: number | string | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

/**
 * A paired "minimum / maximum" number input that refuses to let the minimum
 * exceed the maximum. It shows an inline error and blocks native form submit
 * via setCustomValidity, so the server action never fires with a bad range.
 * The server schemas still re-validate as a backstop.
 */
export function MinMaxFields({
  minName,
  maxName,
  minLabel,
  maxLabel,
  minDefaultValue,
  maxDefaultValue,
  minFieldMin = 1,
  maxFieldMin = 1,
  step,
  required = false,
  maxPlaceholder,
  message = "Максимум не может быть меньше минимума.",
}: Props) {
  const [min, setMin] = useState(() => toValue(minDefaultValue));
  const [max, setMax] = useState(() => toValue(maxDefaultValue));
  const maxRef = useRef<HTMLInputElement>(null);

  const invalid = min.trim() !== "" && max.trim() !== "" && Number(min) > Number(max);

  useEffect(() => {
    maxRef.current?.setCustomValidity(invalid ? message : "");
  }, [invalid, message]);

  return (
    <>
      <label>
        <span>{minLabel}</span>
        <input
          name={minName}
          type="number"
          min={minFieldMin}
          step={step}
          required={required}
          value={min}
          aria-invalid={invalid || undefined}
          onChange={(event) => setMin(event.target.value)}
        />
      </label>
      <label>
        <span>{maxLabel}</span>
        <input
          ref={maxRef}
          name={maxName}
          type="number"
          min={maxFieldMin}
          step={step}
          required={required}
          placeholder={maxPlaceholder}
          value={max}
          aria-invalid={invalid || undefined}
          onChange={(event) => setMax(event.target.value)}
        />
      </label>
      {invalid ? (
        <p className="form-error min-max-error" style={{ gridColumn: "1 / -1", margin: 0 } as CSSProperties}>
          {message}
        </p>
      ) : null}
    </>
  );
}

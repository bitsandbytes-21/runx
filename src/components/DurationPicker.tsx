"use client";

import { useId } from "react";
import {
  CUSTOM_DURATION_OPTIONS_MIN,
  DURATION_PRESETS_MIN,
} from "@/lib/run/durations";

interface DurationPickerProps {
  value: number;
  onChange: (durationMin: number) => void;
}

export function DurationPicker({ value, onChange }: DurationPickerProps) {
  const name = useId();
  const isPreset = (DURATION_PRESETS_MIN as readonly number[]).includes(value);
  return (
    <div className="flex flex-col gap-3">
      {/* Native radios give arrow-key navigation and one checked option for free. */}
      <div
        role="radiogroup"
        aria-label="Run length"
        className="grid grid-cols-3 gap-1 rounded-pill bg-segment-track p-1"
      >
        {DURATION_PRESETS_MIN.map((option) => (
          <label
            key={option}
            className="flex min-h-tap cursor-pointer items-center justify-center rounded-pill text-subhead font-semibold text-fg has-[:checked]:bg-tint-bg has-[:checked]:text-label has-[:checked]:shadow-soft has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-sys-blue"
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {option} min
          </label>
        ))}
      </div>
      <label className="flex items-center justify-between gap-3 text-footnote text-fg-2">
        <span>Other length</span>
        <select
          aria-label="Other length"
          value={isPreset ? "" : String(value)}
          onChange={(event) => onChange(Number(event.target.value))}
          className="min-h-tap rounded-pill bg-segment-track px-4 text-subhead font-semibold text-fg"
        >
          <option value="" disabled>
            Choose
          </option>
          {CUSTOM_DURATION_OPTIONS_MIN.map((option) => (
            <option key={option} value={option} className="text-label">
              {option} min
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

"use client";

import { Check } from "lucide-react";

export interface ChipOption<T extends string | number> {
  value: T;
  label: string;
}

interface ChipMultiSelectProps<T extends string | number> {
  options: ChipOption<T>[];
  selected: T[];
  onChange: (next: T[]) => void;
  disabled?: boolean;
  /** Optional aria-label for the chip group container */
  ariaLabel?: string;
}

/**
 * Multi-select chip group. Tap to toggle; filled brand teal when selected,
 * outlined otherwise. Selection order is preserved by the caller's `selected`
 * array - we always emit the union or removal in O(n).
 */
export default function ChipMultiSelect<T extends string | number>({
  options,
  selected,
  onChange,
  disabled,
  ariaLabel,
}: ChipMultiSelectProps<T>) {
  const selectedSet = new Set(selected);

  function toggle(value: T) {
    if (disabled) return;
    if (selectedSet.has(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2"
    >
      {options.map((opt) => {
        const on = selectedSet.has(opt.value);
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => toggle(opt.value)}
            disabled={disabled}
            aria-pressed={on}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
              on
                ? "border-primary bg-primary text-white shadow-[0_2px_8px_rgba(79,149,152,0.25)]"
                : "border-border bg-surface text-text-secondary hover:border-primary/40 hover:text-primary"
            }`}
          >
            {on && <Check size={12} strokeWidth={3} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

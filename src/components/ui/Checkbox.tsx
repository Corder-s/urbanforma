import { Check } from "lucide-react";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
}

export function Checkbox({ checked, onChange, label, id }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className="inline-flex cursor-pointer select-none items-center gap-2.5 text-sm font-medium text-muted"
    >
      <span className="relative inline-flex">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={[
            "grid h-5 w-5 place-items-center rounded-[7px] border transition duration-150",
            checked
              ? "border-primary bg-primary text-white"
              : "border-line-strong bg-white text-transparent hover:border-primary",
            "peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20",
          ].join(" ")}
          aria-hidden="true"
        >
          <Check size={13} strokeWidth={3} />
        </span>
      </span>
      {label}
    </label>
  );
}

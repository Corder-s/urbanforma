import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input } from "./Input";

interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  hint?: string;
}

export function PasswordInput({
  label = "Password",
  error,
  hint,
  ...rest
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      label={label}
      name={rest.name ?? "password"}
      type={visible ? "text" : "password"}
      autoComplete="current-password"
      icon={<Lock size={18} strokeWidth={2} />}
      error={error}
      hint={hint}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="rounded-md p-1 text-faint transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      }
      {...rest}
    />
  );
}

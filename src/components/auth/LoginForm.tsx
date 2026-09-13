import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail, ArrowRight, Github, Construction } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { PasswordInput } from "../ui/PasswordInput";
import { Checkbox } from "../ui/Checkbox";
import { Divider } from "../ui/Divider";
import { useAuth } from "../../features/auth/AuthProvider";
import { prefetchRoute } from "../../app/routeLoaders";
import {
  getRememberedEmail,
  isValidEmail,
} from "../../features/auth/auth.service";

interface FieldErrors {
  email?: string;
  password?: string;
  general?: string;
}

const GENERIC_ERROR =
  "Unable to sign in. Please check your email and password.";

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [socialNote, setSocialNote] = useState<string | null>(null);

  useEffect(() => {
    const remembered = getRememberedEmail();
    if (remembered) {
      setEmail(remembered);
      setRemember(true);
    }
  }, []);

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!email.trim()) e.email = "Work email is required.";
    else if (!isValidEmail(email))
      e.email = "Please enter a valid email address.";
    if (!password) e.password = "Password is required.";
    else if (password.length < 6)
      e.password = "Password must be at least 6 characters.";
    return e;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (submitting) return; // block duplicate submissions
    const found = validate();
    setErrors(found);
    setSocialNote(null);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    const dest = location.state?.from ?? "/app";
    // The destination is now certain, so overlap its chunk download + parse
    // with the auth round trip instead of starting it after the redirect.
    prefetchRoute(dest);
    try {
      // delegate entirely to the auth abstraction (dev implementation for now)
      await login({ email, password, remember });
      navigate(dest, { replace: true });
    } catch {
      setErrors({ general: GENERIC_ERROR });
    } finally {
      setSubmitting(false);
    }
  }

  function onSocial(name: string) {
    setSocialNote(`${name} sign-in is coming soon. Use email for now.`);
  }

  return (
    <div>
      <div className="mb-7 text-center lg:text-left">
        <h1 className="text-[28px] font-extrabold tracking-tight text-ink sm:text-[32px]">
          Welcome back
        </h1>
        <p className="mt-1.5 text-[15px] text-muted">
          Sign in to continue designing smarter cities.
        </p>
      </div>

      {errors.general && (
        <div
          role="alert"
          className="mb-5 animate-pop rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm font-medium text-danger"
        >
          {errors.general}
        </div>
      )}

      {socialNote && (
        <div
          role="status"
          className="mb-5 animate-pop flex items-center gap-2.5 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm font-medium text-warning"
        >
          <Construction size={17} className="shrink-0" />
          {socialNote}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Input
          label="Work Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail size={18} />}
          value={email}
          error={errors.email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
          }}
        />

        <PasswordInput
          name="password"
          label="Password"
          placeholder="Enter your password"
          value={password}
          error={errors.password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password)
              setErrors((p) => ({ ...p, password: undefined }));
          }}
        />

        <div className="flex items-center justify-between pt-1">
          <Checkbox
            id="remember"
            checked={remember}
            onChange={setRemember}
            label="Remember me"
          />
          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-primary hover:text-primary-dark"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" fullWidth loading={submitting} className="mt-2">
          {submitting ? "Signing in…" : "Sign In"}
          {!submitting && <ArrowRight size={18} />}
        </Button>
      </form>

      <Divider className="my-6">or continue with</Divider>

      <div className="grid grid-cols-3 gap-3">
        <SocialButton label="Google" onClick={() => onSocial("Google")}>
          <GoogleIcon />
        </SocialButton>
        <SocialButton label="Microsoft" onClick={() => onSocial("Microsoft")}>
          <MicrosoftIcon />
        </SocialButton>
        <SocialButton label="GitHub" onClick={() => onSocial("GitHub")}>
          <Github size={18} className="text-ink" />
        </SocialButton>
      </div>

      <p className="mt-7 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link
          to="/register"
          className="font-semibold text-primary hover:text-primary-dark"
        >
          Create account
        </Link>
      </p>

      <p className="mt-4 rounded-lg bg-surface-2 px-3 py-2 text-center text-[12px] text-muted">
        Demo: any valid email + a 6+ character password.
      </p>
    </div>
  );
}

function SocialButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Continue with ${label} (coming soon)`}
      title={`${label} sign-in coming soon`}
      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white text-sm font-semibold text-ink transition hover:border-primary hover:shadow-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.07-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.7c1.8 0 3.4.6 4.6 1.8l3.5-3.5A12 12 0 0 0 1.3 6.6l4 3.1C6.2 6.8 8.9 4.7 12 4.7z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

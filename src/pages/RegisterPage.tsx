import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, ArrowRight } from "lucide-react";
import { AuthLayout } from "../components/auth/AuthLayout";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PasswordInput } from "../components/ui/PasswordInput";
import { Divider } from "../components/ui/Divider";
import { register, isValidEmail } from "../features/auth/auth.service";

interface Errors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

/** Register UI — functional validation; routes to /login on success. */
export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): Errors {
    const e: Errors = {};
    if (!name.trim()) e.name = "Full name is required.";
    if (!email.trim()) e.email = "Work email is required.";
    else if (!isValidEmail(email)) e.email = "Please enter a valid email address.";
    if (!password) e.password = "Password is required.";
    else if (password.length < 6) e.password = "Password must be at least 6 characters.";
    if (confirm !== password) e.confirm = "Passwords do not match.";
    return e;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    setSubmitting(true);
    try {
      await register({ name, email, password });
      navigate("/login", { replace: true });
    } catch {
      setErrors({ email: "Could not create account. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div>
        <div className="mb-7 text-center lg:text-left">
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink sm:text-[32px]">
            Create your account
          </h1>
          <p className="mt-1.5 text-[15px] text-muted">
            Start planning smarter cities in minutes.
          </p>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Input label="Full Name" name="name" placeholder="Jane Planner"
            icon={<User size={18} />} value={name} error={errors.name}
            onChange={(e) => setName(e.target.value)} />
          <Input label="Work Email" name="email" type="email" placeholder="you@example.com"
            icon={<Mail size={18} />} value={email} error={errors.email}
            onChange={(e) => setEmail(e.target.value)} />
          <PasswordInput name="password" label="Password" placeholder="At least 6 characters"
            value={password} error={errors.password} onChange={(e) => setPassword(e.target.value)} />
          <PasswordInput name="confirm" label="Confirm Password" autoComplete="new-password"
            placeholder="Re-enter your password" value={confirm} error={errors.confirm}
            onChange={(e) => setConfirm(e.target.value)} />

          <Button type="submit" size="lg" fullWidth loading={submitting} className="mt-2">
            {submitting ? "Creating…" : "Create Account"}
            {!submitting && <ArrowRight size={18} />}
          </Button>
        </form>

        <Divider className="my-6" />

        <p className="text-center text-sm text-muted">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:text-primary-dark">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

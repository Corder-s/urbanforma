import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { AuthLayout } from "../components/auth/AuthLayout";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { requestPasswordReset, isValidEmail } from "../features/auth/auth.service";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!email.trim()) return setError("Work email is required.");
    if (!isValidEmail(email)) return setError("Please enter a valid email address.");
    setError(undefined);
    setSubmitting(true);
    await requestPasswordReset(email);
    setSubmitting(false);
    setSent(true);
  }

  return (
    <AuthLayout>
      <div>
        <div className="mb-7 text-center lg:text-left">
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink sm:text-[32px]">
            Reset password
          </h1>
          <p className="mt-1.5 text-[15px] text-muted">
            Enter your work email and we&apos;ll send you a reset link.
          </p>
        </div>

        {sent ? (
          <div className="animate-pop rounded-2xl border border-success/25 bg-success/5 p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-success" size={26} />
              <div>
                <p className="font-bold text-ink">Check your inbox</p>
                <p className="text-sm text-muted">Reset instructions have been sent.</p>
              </div>
            </div>
            <Link to="/login"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark">
              Back to sign in <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <Input label="Work Email" name="email" type="email" placeholder="you@example.com"
              icon={<Mail size={18} />} value={email} error={error}
              onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" size="lg" fullWidth loading={submitting} className="mt-2">
              Send Reset Link
            </Button>
            <p className="text-center text-sm text-muted">
              Remembered it?{" "}
              <Link to="/login" className="font-semibold text-primary hover:text-primary-dark">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { registerCitizen } from "@/lib/api";
import {
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  UserCheck,
  ShieldCheck,
  Search,
  Check,
  X,
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();

  // Form inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password strength calculation
  const passwordCriteria = useMemo(() => {
    return {
      hasMinLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (passwordCriteria.hasMinLength) score += 1;
    if (passwordCriteria.hasUpper && passwordCriteria.hasLower) score += 1;
    if (passwordCriteria.hasNumber) score += 1;
    if (passwordCriteria.hasSpecial) score += 1;
    return score;
  }, [passwordCriteria]);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();

    // Client-side validation
    if (!trimmedName) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!trimmedUsername || trimmedUsername.length < 3) {
      setErrorMessage("Username must be at least 3 characters long.");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      setErrorMessage("Username can only contain alphanumeric characters, underscores, and dashes.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify both password fields.");
      return;
    }
    if (!acknowledged) {
      setErrorMessage("Please acknowledge the citizen terms of access to continue.");
      return;
    }

    setIsSubmitting(true);

    try {
      await registerCitizen({
        name: trimmedName,
        email: trimmedEmail,
        username: trimmedUsername,
        password,
      });

      // Redirect to login with registration flag
      router.push("/login?registered=true");
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Registration failed. Please verify your details and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-parchment flex flex-col justify-between">
      <Navbar />

      <div className="mx-auto max-w-xl px-4 sm:px-6 py-8 sm:py-12 w-full flex-1 flex flex-col justify-center">
        {/* Main Card */}
        <div className="bg-parchment p-6 sm:p-8 rounded-2xl plot-border-solid shadow-sm space-y-6">
          {/* Header */}
          <div className="text-center space-y-1.5 border-b border-ink/10 pb-5">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-ink text-parchment font-serif text-lg font-bold shadow-sm mb-1">
              भू
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-ink">
                BHU-SETU
              </span>
              <span className="rounded bg-ochre/20 text-ochre-dark border border-ochre/30 px-1.5 py-0.5 font-mono text-[9px] font-bold">
                CITIZEN REGISTRATION
              </span>
            </div>
            <h1 className="font-serif text-lg sm:text-xl font-bold text-ink">
              Create Citizen Account
            </h1>
            <p className="text-xs text-ink/65 max-w-md mx-auto">
              Register for verified parcel search, cadastral records, mutation history, and land services.
            </p>
          </div>

          {/* Security / Provisioning Notice */}
          <div className="p-3 bg-ink/5 border border-ink/10 rounded-lg text-xs text-ink/75 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 text-ochre-dark mt-0.5" />
            <div>
              <strong className="font-semibold text-ink">Notice:</strong> Public self-registration is exclusively for{" "}
              <span className="font-semibold text-ink">Citizen</span> access. Revenue Officer, Sub-Registrar, and Administrative roles are provisioned through authorized government departmental workflows.
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 bg-brick/10 border border-brick/30 rounded-lg text-xs text-brick flex items-start gap-2.5 animate-in fade-in duration-200"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Registration Issue:</strong> {errorMessage}
              </div>
            </div>
          )}

          {/* Citizen Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name */}
            <div>
              <label
                htmlFor="signup-name"
                className="block text-xs font-bold text-ink mb-1"
              >
                Full Legal Name <span className="text-brick">*</span>
              </label>
              <input
                id="signup-name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sunita Devi"
                disabled={isSubmitting}
                className="w-full bg-parchment px-3.5 py-2 rounded-lg border border-ink/20 font-sans text-xs sm:text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink transition-colors disabled:opacity-50"
                required
              />
            </div>

            {/* Email & Username Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="signup-email"
                  className="block text-xs font-bold text-ink mb-1"
                >
                  Email Address <span className="text-brick">*</span>
                </label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  disabled={isSubmitting}
                  className="w-full bg-parchment px-3.5 py-2 rounded-lg border border-ink/20 font-sans text-xs sm:text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink transition-colors disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="signup-username"
                  className="block text-xs font-bold text-ink mb-1"
                >
                  Username <span className="text-brick">*</span>
                </label>
                <input
                  id="signup-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. sunita_devi"
                  disabled={isSubmitting}
                  className="w-full bg-parchment px-3.5 py-2 rounded-lg border border-ink/20 font-sans text-xs sm:text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink transition-colors disabled:opacity-50"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="signup-password"
                  className="block text-xs font-bold text-ink"
                >
                  Password <span className="text-brick">*</span>
                </label>
                {password.length > 0 && (
                  <span className="text-[10px] text-ink/60 font-mono">
                    Strength:{" "}
                    <span
                      className={`font-bold ${
                        strengthScore <= 1
                          ? "text-brick"
                          : strengthScore <= 3
                          ? "text-ochre-dark"
                          : "text-emerald-700"
                      }`}
                    >
                      {strengthScore <= 1 ? "Weak" : strengthScore <= 3 ? "Moderate" : "Strong"}
                    </span>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  disabled={isSubmitting}
                  className="w-full bg-parchment px-3.5 py-2 rounded-lg border border-ink/20 font-mono text-xs sm:text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink transition-colors pr-10 disabled:opacity-50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/50 hover:text-ink transition-colors p-1 rounded focus:outline-none"
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="grid grid-cols-4 gap-1 h-1">
                    <div
                      className={`h-full rounded-full transition-colors ${
                        strengthScore >= 1 ? (strengthScore === 1 ? "bg-brick" : "bg-ochre") : "bg-ink/10"
                      }`}
                    />
                    <div
                      className={`h-full rounded-full transition-colors ${
                        strengthScore >= 2 ? (strengthScore <= 3 ? "bg-ochre" : "bg-emerald-500") : "bg-ink/10"
                      }`}
                    />
                    <div
                      className={`h-full rounded-full transition-colors ${
                        strengthScore >= 3 ? "bg-emerald-500" : "bg-ink/10"
                      }`}
                    />
                    <div
                      className={`h-full rounded-full transition-colors ${
                        strengthScore >= 4 ? "bg-emerald-600" : "bg-ink/10"
                      }`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-ink/65 font-sans">
                    <span className={`flex items-center gap-1 ${passwordCriteria.hasMinLength ? "text-emerald-700 font-medium" : ""}`}>
                      {passwordCriteria.hasMinLength ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 inline-block">•</span>} At least 8 characters
                    </span>
                    <span className={`flex items-center gap-1 ${passwordCriteria.hasNumber ? "text-emerald-700 font-medium" : ""}`}>
                      {passwordCriteria.hasNumber ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 inline-block">•</span>} Contains a number
                    </span>
                    <span className={`flex items-center gap-1 ${passwordCriteria.hasUpper && passwordCriteria.hasLower ? "text-emerald-700 font-medium" : ""}`}>
                      {passwordCriteria.hasUpper && passwordCriteria.hasLower ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 inline-block">•</span>} Upper & lowercase
                    </span>
                    <span className={`flex items-center gap-1 ${passwordCriteria.hasSpecial ? "text-emerald-700 font-medium" : ""}`}>
                      {passwordCriteria.hasSpecial ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 inline-block">•</span>} Special character
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="signup-confirm-password"
                  className="block text-xs font-bold text-ink"
                >
                  Confirm Password <span className="text-brick">*</span>
                </label>
                {passwordsMatch && (
                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Match
                  </span>
                )}
                {passwordsMismatch && (
                  <span className="text-[10px] text-brick font-bold flex items-center gap-0.5">
                    <X className="w-3 h-3" /> Passwords do not match
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="signup-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  disabled={isSubmitting}
                  className={`w-full bg-parchment px-3.5 py-2 rounded-lg border font-mono text-xs sm:text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-1 transition-colors pr-10 disabled:opacity-50 ${
                    passwordsMismatch
                      ? "border-brick focus:border-brick focus:ring-brick"
                      : "border-ink/20 focus:border-ink focus:ring-ink"
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/50 hover:text-ink transition-colors p-1 rounded focus:outline-none"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Declaration Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-0.5 h-4 w-4 rounded border-ink/30 text-ink focus:ring-ink"
                  required
                />
                <span className="text-[11px] text-ink/75 leading-relaxed">
                  I acknowledge that this citizen account is for verified land record search, spatial parcel inspection, and citizen service requests.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-ink text-parchment py-3 rounded-lg text-xs sm:text-sm font-bold hover:bg-ink-light transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account…</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 text-ochre" />
                    <span>Create Citizen Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Back to Login */}
          <div className="pt-4 border-t border-ink/10 text-center text-xs text-ink/65">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-ochre-dark font-bold hover:underline inline-flex items-center gap-0.5"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Public Parcel Search helper */}
        <div className="mt-6 text-center text-xs text-ink/60">
          Want to explore without signing in?{" "}
          <Link
            href="/citizen"
            className="text-ochre-dark font-semibold hover:underline inline-flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Land on Citizen Portal</span>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-ink/10 py-6 px-6 text-xs text-ink/50 text-center">
        Bhu-Setu · SIH 2026 — Integrated GIS based Digital Public Infrastructure for Land Governance
      </footer>
    </main>
  );
}

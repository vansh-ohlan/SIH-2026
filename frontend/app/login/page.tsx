"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/authContext";
import { UserRole } from "@/lib/types";
import {
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  UserCheck,
  FileCheck2,
  Building,
  ShieldCheck,
  Search,
  UserPlus,
} from "lucide-react";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithCredentials, loginAsDevRole } = useAuth();

  // Primary Login Form State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if redirected after successful registration
  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccessMessage("Account created successfully. Please sign in with your credentials.");
    }
  }, [searchParams]);

  // Demo Persona Loading State
  const [activeDemoRole, setActiveDemoRole] = useState<UserRole | null>(null);

  // Demo Persona Configurations for SIH Jury Evaluation
  const demoPersonas = [
    {
      role: "citizen" as UserRole,
      label: "Citizen Demo",
      email: "citizen@bhusetu.demo",
      icon: UserCheck,
      badge: "Public Access",
    },
    {
      role: "revenue_officer" as UserRole,
      label: "Revenue Officer Demo",
      email: "officer@bhusetu.demo",
      icon: FileCheck2,
      badge: "Revenue Circle",
    },
    {
      role: "registrar" as UserRole,
      label: "Sub-Registrar Demo",
      email: "registrar@bhusetu.demo",
      icon: Building,
      badge: "Registry Desk",
    },
    {
      role: "admin" as UserRole,
      label: "Administrator Demo",
      email: "admin@bhusetu.demo",
      icon: ShieldCheck,
      badge: "DPI Governance",
    },
  ];

  const redirectForRole = (role: UserRole) => {
    switch (role) {
      case "citizen":
        router.push("/citizen");
        break;
      case "revenue_officer":
        router.push("/officer");
        break;
      case "registrar":
        router.push("/registrar");
        break;
      case "admin":
        router.push("/admin");
        break;
      default:
        router.push("/citizen");
        break;
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedIdentifier = identifier.trim();
    const trimmedPassword = password.trim();

    if (!trimmedIdentifier || !trimmedPassword) {
      setErrorMessage("Please enter both username/email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const authUser = await loginWithCredentials(trimmedIdentifier, trimmedPassword);
      redirectForRole(authUser.role);
    } catch (err: any) {
      setErrorMessage(err?.message || "Invalid username/email or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (persona: (typeof demoPersonas)[0]) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setActiveDemoRole(persona.role);

    try {
      await loginAsDevRole(persona.role);
      redirectForRole(persona.role);
    } catch (err: any) {
      setErrorMessage(err?.message || "Demo login failed");
    } finally {
      setActiveDemoRole(null);
    }
  };

  const isAnyLoading = isSubmitting || activeDemoRole !== null;

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-8 sm:py-12 w-full flex-1 flex flex-col justify-center">
      {/* Main Login Card */}
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
          </div>
          <h1 className="font-serif text-lg sm:text-xl font-bold text-ink">
            Digital Land Governance Platform
          </h1>
          <p className="text-xs text-ink/65 max-w-sm mx-auto">
            Secure access to unified land information and governance services.
          </p>
        </div>

        {/* Success Alert Banner (e.g. after citizen signup) */}
        {successMessage && (
          <div
            role="status"
            className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in duration-200"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <strong className="font-semibold">Success:</strong> {successMessage}
            </div>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3.5 bg-brick/10 border border-brick/30 rounded-lg text-xs text-brick flex items-start gap-2.5 animate-in fade-in duration-200"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Authentication Failed:</strong> {errorMessage}
            </div>
          </div>
        )}

        {/* PRIMARY: Username/Email + Password Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="login-identifier"
              className="block text-xs font-bold text-ink mb-1.5"
            >
              Email or Username
            </label>
            <input
              id="login-identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter your email or username"
              disabled={isAnyLoading}
              className="w-full bg-parchment px-3.5 py-2.5 rounded-lg border border-ink/20 font-sans text-xs sm:text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink transition-colors disabled:opacity-50"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-bold text-ink"
              >
                Password
              </label>
              <span className="text-[10px] text-ink/50" title="Password recovery available via administrative desk">
                Forgot password?
              </span>
            </div>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isAnyLoading}
                className="w-full bg-parchment px-3.5 py-2.5 rounded-lg border border-ink/20 font-mono text-xs sm:text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink transition-colors pr-10 disabled:opacity-50"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isAnyLoading}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/50 hover:text-ink transition-colors p-1 rounded focus:outline-none focus:ring-1 focus:ring-ink"
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={isAnyLoading}
              className="w-full bg-ink text-parchment py-3 rounded-lg text-xs sm:text-sm font-bold hover:bg-ink-light transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-ochre" />
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Citizen Sign Up Link */}
        <div className="text-center py-2 px-3 bg-ink/5 rounded-lg border border-ink/10 text-xs text-ink/80">
          <span>Don&apos;t have an account? </span>
          <Link
            href="/signup"
            className="text-ochre-dark font-bold hover:underline inline-flex items-center gap-1 ml-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Citizen Account</span>
          </Link>
        </div>

        {/* SECONDARY: SIH Demonstration & Evaluator Access */}
        <div className="pt-5 border-t border-ink/10 space-y-3">
          <div className="text-center space-y-0.5">
            <h2 className="font-serif text-xs font-bold uppercase tracking-wider text-ink/70">
              SIH Demo Accounts
            </h2>
            <p className="text-[11px] text-ink/50">
              Quick evaluation access for presentation personas
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {demoPersonas.map((persona) => {
              const Icon = persona.icon;
              const isLoadingThis = activeDemoRole === persona.role;

              return (
                <button
                  key={persona.role}
                  type="button"
                  onClick={() => handleDemoLogin(persona)}
                  disabled={isAnyLoading}
                  className="p-2.5 rounded-lg border border-ink/15 hover:border-ink hover:bg-ink/5 transition-all text-left bg-parchment flex items-center justify-between group disabled:opacity-50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded bg-ink text-parchment flex items-center justify-center font-bold shrink-0">
                      {isLoadingThis ? (
                        <Loader2 className="w-3 h-3 animate-spin text-ochre" />
                      ) : (
                        <Icon className="w-3 h-3 text-ochre" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-ink group-hover:text-ochre-dark transition-colors truncate">
                        {persona.label}
                      </div>
                      <div className="text-[9px] text-ink/50 font-mono truncate">
                        {persona.badge}
                      </div>
                    </div>
                  </div>

                  <span className="text-ink/40 group-hover:text-ink group-hover:translate-x-0.5 transition-all text-xs font-bold shrink-0 ml-1">
                    →
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Public Citizen Navigation Helper */}
      <div className="mt-6 text-center text-xs text-ink/60">
        Looking for public land records?{" "}
        <Link
          href="/citizen"
          className="text-ochre-dark font-semibold hover:underline inline-flex items-center gap-1"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search Land on Citizen Portal</span>
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-parchment flex flex-col justify-between">
      <Navbar />
      <Suspense fallback={
        <div className="mx-auto max-w-xl px-4 py-16 text-center text-xs text-ink/60 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading authentication portal…
        </div>
      }>
        <LoginFormContent />
      </Suspense>

      {/* Footer */}
      <footer className="border-t border-ink/10 py-6 px-6 text-xs text-ink/50 text-center">
        Bhu-Setu · SIH 2026 — Integrated GIS based Digital Public Infrastructure for Land Governance
      </footer>
    </main>
  );
}

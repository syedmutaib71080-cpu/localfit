"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Mail } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [emailSent, setEmailSent] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Password confirmation does not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      // If Supabase has email confirmation enabled and user has no active session yet
      if (data.user && !data.session) {
        setEmailSent(email.trim());
        setLoading(false);
        return;
      }

      // If user session was immediately established (auto-confirm)
      if (data.session) {
        router.push("/onboarding");
        router.refresh();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <Card variant="default" className="shadow-[0_2px_8px_rgba(28,31,29,0.04)]">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E2ECE4] text-[#375A41] mb-2">
            <Mail size={24} />
          </div>
          <CardTitle className="text-xl">Check your inbox</CardTitle>
          <CardDescription>
            We have sent a confirmation link to <span className="font-semibold text-[#1C1F1D]">{emailSent}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-[#C7DBD0] bg-[#E2ECE4]/60 p-4 text-xs text-[#263B2C] space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 size={16} className="text-[#375A41]" />
              <span>Verification email sent</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Click the link in your email to confirm your account and proceed to the personalized onboarding experience.
            </p>
          </div>
          <Button href="/login" variant="outline" size="md" className="w-full">
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="default" className="shadow-[0_2px_8px_rgba(28,31,29,0.04)]">
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>
          Begin your journey with personalized nutrition and mindful wellness.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50/80 p-3 text-xs text-red-800 flex items-start gap-2"
            >
              <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="fullName"
              className="text-xs font-semibold uppercase tracking-wider text-[#575E59]"
            >
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alex Morgan"
              disabled={loading}
              className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5]/50 px-3.5 py-2.5 text-sm text-[#1C1F1D] placeholder-[#939D95] focus:outline-none focus:ring-2 focus:ring-[#437151] disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-wider text-[#575E59]"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              disabled={loading}
              className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5]/50 px-3.5 py-2.5 text-sm text-[#1C1F1D] placeholder-[#939D95] focus:outline-none focus:ring-2 focus:ring-[#437151] disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wider text-[#575E59]"
            >
              Password (min. 8 characters)
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5]/50 px-3.5 py-2.5 pr-10 text-sm text-[#1C1F1D] placeholder-[#939D95] focus:outline-none focus:ring-2 focus:ring-[#437151] disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717A73] hover:text-[#1C1F1D] p-1 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="text-xs font-semibold uppercase tracking-wider text-[#575E59]"
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5]/50 px-3.5 py-2.5 pr-10 text-sm text-[#1C1F1D] placeholder-[#939D95] focus:outline-none focus:ring-2 focus:ring-[#437151] disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717A73] hover:text-[#1C1F1D] p-1 focus:outline-none"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={loading}
            className="w-full mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Creating account...
              </span>
            ) : (
              "Create Account"
            )}
          </Button>
        </CardContent>

        <CardFooter className="justify-center border-t border-[#E8E5DD] pt-4">
          <p className="text-xs text-[#575E59]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#437151] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

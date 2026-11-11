"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setSentSuccess(true);
      setLoading(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
      setLoading(false);
    }
  };

  return (
    <Card variant="default" className="shadow-[0_2px_8px_rgba(28,31,29,0.04)]">
      <CardHeader>
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>
          Enter your registered email address and we will send you secure recovery instructions.
        </CardDescription>
      </CardHeader>

      {sentSuccess ? (
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-[#C7DBD0] bg-[#E2ECE4]/60 p-4 text-xs text-[#263B2C] space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 size={16} className="text-[#375A41]" />
              <span>Password reset link sent</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              We dispatched an authentication recovery link to{" "}
              <span className="font-semibold">{email}</span>. Click the link to update your password.
            </p>
          </div>
          <Button href="/login" variant="outline" size="md" className="w-full">
            Back to Sign In
          </Button>
        </CardContent>
      ) : (
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
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-wider text-[#575E59]"
              >
                Registered Email Address
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
                  Sending recovery link...
                </span>
              ) : (
                "Send Reset Instructions"
              )}
            </Button>
          </CardContent>

          <CardFooter className="justify-center border-t border-[#E8E5DD] pt-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-[#575E59] hover:text-[#1C1F1D]"
            >
              <ArrowLeft size={13} />
              <span>Back to Sign In</span>
            </Link>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}

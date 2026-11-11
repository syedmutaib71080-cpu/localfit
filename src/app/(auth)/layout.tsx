import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF8F5] p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center text-center">
          <Logo size="lg" showTagline />
        </div>
        {children}
        <p className="text-center text-xs text-[#717A73]">
          <Link href="/" className="hover:text-[#1C1F1D] underline underline-offset-4 transition-colors">
            Return to LocalFit home
          </Link>
        </p>
      </div>
    </div>
  );
}

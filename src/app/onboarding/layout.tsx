import * as React from "react";
import { Logo } from "@/components/ui/logo";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1F1D] flex flex-col">
      <header className="border-b border-[#E8E5DD] bg-[#FAF8F5]/80 backdrop-blur-md py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Logo size="md" />
          <span className="text-xs font-semibold text-[#575E59]">
            Account Setup
          </span>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  );
}

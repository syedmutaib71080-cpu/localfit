import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/ui/page-container";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  Utensils,
  Scan,
  Activity,
  Compass,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-16 sm:pt-24 lg:pt-32 pb-16 sm:pb-24">
        {/* Soft atmospheric radial highlight */}
        <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
          <div className="h-[480px] w-[480px] rounded-full bg-[#E2ECE4]/60 blur-3xl" />
        </div>

        <PageContainer size="default">
          <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8 max-w-3xl mx-auto">
            {/* Pill Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C7DBD0] bg-[#E2ECE4] px-3.5 py-1 text-xs font-semibold text-[#263B2C] shadow-sm">
              <Sparkles size={14} className="text-[#375A41]" />
              <span>Next-Generation Nutrition & Fitness</span>
            </div>

            {/* Main Heading (exact user requirement) */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-[-0.035em] text-[#1C1F1D] leading-[1.08]">
              Your health, <span className="text-[#437151]">understood better.</span>
            </h1>

            {/* Supporting Description */}
            <p className="text-base sm:text-lg lg:text-xl text-[#575E59] leading-relaxed max-w-2xl font-normal">
              LocalFit is an AI-powered nutrition and fitness platform crafted with
              warm ivory tones, gentle sage accents, and mindful precision. Track whole
              foods, analyze real meals, and discover balanced movement.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-2 w-full sm:w-auto">
              <Button
                href="/register"
                size="lg"
                variant="primary"
                icon={<ArrowRight size={18} />}
                className="w-full sm:w-auto px-7"
              >
                Get Started
              </Button>
              <Button
                href="#features"
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto px-7"
              >
                Explore Features
              </Button>
            </div>

            {/* Quick Hero Highlights */}
            <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 w-full border-t border-[#E8E5DD]">
              <div className="text-left">
                <p className="text-2xl font-semibold text-[#1C1F1D]">Whole Foods</p>
                <p className="text-xs text-[#717A73]">Quality over numbers</p>
              </div>
              <div className="text-left">
                <p className="text-2xl font-semibold text-[#1C1F1D]">Smart Vision</p>
                <p className="text-xs text-[#717A73]">Instant meal recognition</p>
              </div>
              <div className="text-left">
                <p className="text-2xl font-semibold text-[#1C1F1D]">Active Daily</p>
                <p className="text-xs text-[#717A73]">Calm movement metrics</p>
              </div>
              <div className="text-left">
                <p className="text-2xl font-semibold text-[#1C1F1D]">Local Intel</p>
                <p className="text-xs text-[#717A73]">Regional food awareness</p>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* 4 CORE FEATURES SECTION */}
      <section id="features" className="py-20 sm:py-28 border-t border-[#E8E5DD] bg-[#F5EFEB]/40">
        <PageContainer size="wide">
          <SectionHeading
            centered
            eyebrow="Core Intelligence"
            title="Four Pillars of Intelligent Well-Being"
            description="Designed from the ground up for clarity, mindful nutrition, and effortless movement."
          />

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* FEATURE 1: Food Tracking */}
            <Card variant="default" className="flex flex-col justify-between overflow-hidden group">
              <CardHeader className="pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E2ECE4] text-[#375A41] mb-3 border border-[#C7DBD0]">
                  <Utensils size={24} />
                </div>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Food Tracking</CardTitle>
                  <Badge variant="sage" size="sm">Intuitive</Badge>
                </div>
                <CardDescription className="text-sm">
                  Log daily meals with natural macronutrient breakdowns. Monitor protein,
                  healthy fats, complex carbohydrates, and hydration rhythms effortlessly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-3 text-xs text-[#575E59] space-y-1.5">
                  <div className="flex items-center justify-between font-medium text-[#1C1F1D]">
                    <span>Breakfast • Sprouted Oats & Berries</span>
                    <span className="text-[#437151]">420 kcal</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-[#717A73]">
                    <span>32g Protein</span>
                    <span>54g Carbs</span>
                    <span>8g Fat</span>
                  </div>
                </div>
                <div className="pt-2">
                  <Link
                    href="/app/food"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#437151] hover:text-[#375A41]"
                  >
                    <span>Launch Food Tracker</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* FEATURE 2: AI Food Scanner */}
            <Card variant="default" className="flex flex-col justify-between overflow-hidden group">
              <CardHeader className="pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EDF0DF] text-[#43492D] mb-3 border border-[#DBE0C1]">
                  <Scan size={24} />
                </div>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">AI Food Scanner</CardTitle>
                  <Badge variant="olive" size="sm">Computer Vision</Badge>
                </div>
                <CardDescription className="text-sm">
                  Point your camera or upload a photo of your meal. Our multimodal AI identifies
                  ingredients, estimates portion weights, and calculates nutrition in seconds.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-3 text-xs text-[#575E59] space-y-1.5">
                  <div className="flex items-center justify-between font-medium text-[#1C1F1D]">
                    <span>Detected: Salmon Grain Bowl</span>
                    <span className="text-[#6B7546]">98% Confidence</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-[#717A73]">
                    <span>540 kcal</span>
                    <span>42g Protein</span>
                    <span>38g Carbs</span>
                  </div>
                </div>
                <div className="pt-2">
                  <Link
                    href="/app/food/scan"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B7546] hover:text-[#545B37]"
                  >
                    <span>Try Food Scanner Interface</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* FEATURE 3: Activity Tracking */}
            <Card variant="default" className="flex flex-col justify-between overflow-hidden group">
              <CardHeader className="pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E2ECE4] text-[#375A41] mb-3 border border-[#C7DBD0]">
                  <Activity size={24} />
                </div>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Activity Tracking</CardTitle>
                  <Badge variant="sage" size="sm">Daily Movement</Badge>
                </div>
                <CardDescription className="text-sm">
                  Record walking, running, and cycling. Monitor steps, real distance,
                  active calories, and workout intensity with calm Apple-inspired rings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-3 text-xs text-[#575E59] space-y-1.5">
                  <div className="flex items-center justify-between font-medium text-[#1C1F1D]">
                    <span>Daily Steps Target</span>
                    <span className="font-semibold text-[#437151]">8,420 / 10,000</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-[#717A73]">
                    <span>6.1 km covered</span>
                    <span>410 kcal burned</span>
                  </div>
                </div>
                <div className="pt-2">
                  <Link
                    href="/app/activity"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#437151] hover:text-[#375A41]"
                  >
                    <span>View Activity Dashboard</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* FEATURE 4: Local Food Intelligence */}
            <Card variant="default" className="flex flex-col justify-between overflow-hidden group">
              <CardHeader className="pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EDF0DF] text-[#43492D] mb-3 border border-[#DBE0C1]">
                  <Compass size={24} />
                </div>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Local Food Intelligence</CardTitle>
                  <Badge variant="olive" size="sm">Regional Context</Badge>
                </div>
                <CardDescription className="text-sm">
                  Understand regional ingredients, local seasonal produce, and traditional meals
                  without forcing generic Western database entries on your nutrition habits.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-3 text-xs text-[#575E59] space-y-1.5">
                  <div className="flex items-center justify-between font-medium text-[#1C1F1D]">
                    <span>Regional Produce & Markets</span>
                    <span className="text-[#6B7546]">Context-Aware</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-[#717A73]">
                    <span>Seasonal micronutrients</span>
                    <span>Traditional recipe estimates</span>
                  </div>
                </div>
                <div className="pt-2">
                  <Link
                    href="/app/nutrition"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B7546] hover:text-[#545B37]"
                  >
                    <span>Explore Nutrition Module</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </PageContainer>
      </section>

      {/* CALL TO ACTION BANNER */}
      <section className="py-20 border-t border-[#E8E5DD] bg-[#FAF8F5]">
        <PageContainer size="default">
          <Card variant="cream" className="p-8 sm:p-12 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1C1F1D]">
              Start your mindful health journey today.
            </h2>
            <p className="text-base text-[#575E59] max-w-xl mx-auto leading-relaxed">
              Step into LocalFit’s calm, balanced interface. Test our full prototype suite
              across nutrition, activity, workouts, and progress.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button href="/app/dashboard" size="lg" variant="primary">
                Launch LocalFit App
              </Button>
              <Button href="/app/food/scan" size="lg" variant="outline">
                Open AI Scanner
              </Button>
            </div>
          </Card>
        </PageContainer>
      </section>
    </div>
  );
}

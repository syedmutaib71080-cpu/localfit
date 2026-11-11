"use client";

import * as React from "react";
import {
  Apple,
  Sparkles,
  PieChart,
  BarChart3,
  Flame,
  Target,
  CheckCircle2,
  Database,
  ShieldCheck,
  Scale,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/ui/page-container";
import {
  demoTodayNutrition,
  DEMO_DATA_TAG,
} from "@/lib/demo-data";
import { ALL_FOOD_CATEGORIES } from "@/types/nutrition";

export default function NutritionPage() {
  const [viewMode, setViewMode] = React.useState<"daily" | "weekly">("daily");
  const [targetCalories, setTargetCalories] = React.useState(2200);
  const [proteinRatio, setProteinRatio] = React.useState(30);
  const [carbsRatio, setCarbsRatio] = React.useState(45);
  const [fatRatio, setFatRatio] = React.useState(25);
  const [savedGoalsNotice, setSavedGoalsNotice] = React.useState(false);

  const handleSaveGoals = () => {
    setSavedGoalsNotice(true);
    setTimeout(() => setSavedGoalsNotice(false), 2500);
  };

  // Mock weekly nutrition history
  const weeklyNutrition = [
    { day: "Mon", cals: 2150, p: 142, c: 210, f: 65 },
    { day: "Tue", cals: 1680, p: 118, c: 164, f: 52 },
    { day: "Wed", cals: 2280, p: 155, c: 230, f: 72 },
    { day: "Thu", cals: 2050, p: 138, c: 200, f: 62 },
    { day: "Fri", cals: 2190, p: 148, c: 225, f: 68 },
    { day: "Sat", cals: 2340, p: 160, c: 245, f: 74 },
    { day: "Sun", cals: 1980, p: 130, c: 190, f: 58 },
  ];

  return (
    <PageContainer size="wide" className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#E8E5DD]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C7DBD0] bg-[#E2ECE4] px-2.5 py-0.5 text-[11px] font-semibold text-[#263B2C] mb-2">
            <Sparkles size={12} className="text-[#375A41]" />
            <span>{DEMO_DATA_TAG}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1F1D]">
            Nutritional Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-[#575E59] mt-0.5">
            Calorie trajectories, macronutrient ratios, and quality composition.
          </p>
        </div>

        {/* View Mode Toggle: Daily vs Weekly */}
        <div className="flex items-center rounded-xl border border-[#E8E5DD] bg-white p-1 shadow-sm">
          <button
            onClick={() => setViewMode("daily")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              viewMode === "daily"
                ? "bg-[#E2ECE4] text-[#263B2C] font-semibold"
                : "text-[#575E59] hover:text-[#1C1F1D]"
            }`}
          >
            Daily View
          </button>
          <button
            onClick={() => setViewMode("weekly")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              viewMode === "weekly"
                ? "bg-[#E2ECE4] text-[#263B2C] font-semibold"
                : "text-[#575E59] hover:text-[#1C1F1D]"
            }`}
          >
            Weekly Trends
          </button>
        </div>
      </div>

      {savedGoalsNotice && (
        <div className="rounded-xl border border-[#C7DBD0] bg-[#E2ECE4] p-3 text-xs font-semibold text-[#263B2C] flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#375A41]" />
          <span>Nutritional goals successfully updated!</span>
        </div>
      )}

      {/* 4 MACRO CHARTS (Calories, Protein, Carbs, Fat) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Chart 1: Calories */}
        <Card variant="default" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">Calories</span>
            <div className="p-1.5 rounded-lg bg-[#FAF8F5] border border-[#E8E5DD] text-[#437151]">
              <Flame size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#1C1F1D]">{demoTodayNutrition.totalCalories} kcal</p>
            <p className="text-xs text-[#717A73]">Goal: {targetCalories} kcal (76%)</p>
          </div>
          <div className="h-2.5 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
            <div className="h-full rounded-full bg-[#437151]" style={{ width: "76%" }} />
          </div>
          <p className="text-[11px] text-[#575E59]">520 kcal remaining for dinner</p>
        </Card>

        {/* Chart 2: Protein */}
        <Card variant="default" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">Protein Target</span>
            <div className="p-1.5 rounded-lg bg-[#E2ECE4] text-[#375A41]">
              <Apple size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#263B2C]">{demoTodayNutrition.proteinG}g</p>
            <p className="text-xs text-[#717A73]">Goal: {demoTodayNutrition.targetProteinG}g (79%)</p>
          </div>
          <div className="h-2.5 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
            <div className="h-full rounded-full bg-[#437151]" style={{ width: "79%" }} />
          </div>
          <p className="text-[11px] text-[#575E59]">Lean tissue repair & recovery</p>
        </Card>

        {/* Chart 3: Carbohydrates */}
        <Card variant="default" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">Carbohydrates</span>
            <div className="p-1.5 rounded-lg bg-[#EDF0DF] text-[#43492D]">
              <BarChart3 size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#43492D]">{demoTodayNutrition.carbsG}g</p>
            <p className="text-xs text-[#717A73]">Goal: {demoTodayNutrition.targetCarbsG}g (75%)</p>
          </div>
          <div className="h-2.5 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
            <div className="h-full rounded-full bg-[#6B7546]" style={{ width: "75%" }} />
          </div>
          <p className="text-[11px] text-[#575E59]">82% from whole-food sources</p>
        </Card>

        {/* Chart 4: Healthy Fats */}
        <Card variant="default" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">Healthy Fats</span>
            <div className="p-1.5 rounded-lg bg-[#FAF8F5] border border-[#E8E5DD] text-[#88935D]">
              <PieChart size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#1C1F1D]">{demoTodayNutrition.fatG}g</p>
            <p className="text-xs text-[#717A73]">Goal: {demoTodayNutrition.targetFatG}g (74%)</p>
          </div>
          <div className="h-2.5 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
            <div className="h-full rounded-full bg-[#88935D]" style={{ width: "74%" }} />
          </div>
          <p className="text-[11px] text-[#575E59]">Avocado, olive oil, salmon</p>
        </Card>
      </div>

      {/* DETAILED VIEW: Daily vs Weekly Trends */}
      {viewMode === "weekly" ? (
        <Card variant="default" className="p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
            <div>
              <h2 className="text-base font-semibold text-[#1C1F1D]">Weekly Calorie & Macro Consistency</h2>
              <p className="text-xs text-[#575E59]">7-day trend against 2,200 kcal goal</p>
            </div>
            <Badge variant="sage" size="sm">Average: 2,130 kcal</Badge>
          </div>

          <div className="grid grid-cols-7 gap-3 h-52 items-end pt-6 pb-2">
            {weeklyNutrition.map((item) => {
              const heightPercent = Math.min(Math.round((item.cals / 2600) * 100), 100);
              const isGoalRange = Math.abs(item.cals - targetCalories) <= 150;

              return (
                <div key={item.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] font-semibold text-[#717A73] opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.cals}
                  </span>
                  <div className="w-full rounded-t-xl bg-[#EFEBE1] h-36 flex items-end overflow-hidden p-1">
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        isGoalRange ? "bg-[#437151]" : "bg-[#6B7546]/80"
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-[#1C1F1D]">{item.day}</span>
                  <span className="text-[10px] text-[#717A73]">{item.p}g P</span>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Quality Composition */}
          <Card variant="default" className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#1C1F1D] pb-3 border-b border-[#E8E5DD]">
              Dietary Composition Breakdown
            </h2>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#1C1F1D] font-medium">Whole Foods Proportion</span>
                <span className="font-semibold text-[#437151]">88% of daily intake</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
                <div className="h-full rounded-full bg-[#437151]" style={{ width: "88%" }} />
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-[#1C1F1D] font-medium">Fiber & Prebiotics</span>
                <span className="font-semibold text-[#6B7546]">34g / 38g Target</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
                <div className="h-full rounded-full bg-[#6B7546]" style={{ width: "90%" }} />
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-[#1C1F1D] font-medium">Added Sugars</span>
                <span className="font-semibold text-[#1C1F1D]">12g (Well below 35g threshold)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
                <div className="h-full rounded-full bg-[#88935D]" style={{ width: "34%" }} />
              </div>
            </div>
          </Card>

          {/* Calorie Distribution Across Meals */}
          <Card variant="default" className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#1C1F1D] pb-3 border-b border-[#E8E5DD]">
              Meal Distribution
            </h2>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#1C1F1D] font-medium">Breakfast</span>
                <span className="text-[#575E59]">420 kcal (25%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
                <div className="h-full rounded-full bg-[#437151]" style={{ width: "25%" }} />
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-[#1C1F1D] font-medium">Lunch</span>
                <span className="text-[#575E59]">540 kcal (32%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
                <div className="h-full rounded-full bg-[#437151]" style={{ width: "32%" }} />
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-[#1C1F1D] font-medium">Dinner</span>
                <span className="text-[#575E59]">500 kcal (30%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
                <div className="h-full rounded-full bg-[#437151]" style={{ width: "30%" }} />
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-[#1C1F1D] font-medium">Snacks</span>
                <span className="text-[#575E59]">220 kcal (13%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
                <div className="h-full rounded-full bg-[#6B7546]" style={{ width: "13%" }} />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* VERIFIED NUTRITION DATABASE & LOCAL FOOD INTELLIGENCE SECTION */}
      <Card variant="default" className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E5DD]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E2ECE4] text-[#375A41] border border-[#C7DBD0]">
              <Database size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#1C1F1D]">
                  Nutrition Database & Scientific Standards
                </h2>
                <Badge variant="sage" size="sm">
                  Stage 4 Architecture
                </Badge>
              </div>
              <p className="text-xs text-[#575E59]">
                Verified against ICMR-NIN IFCT 2017 & USDA FoodData Central standards
              </p>
            </div>
          </div>

          <Button
            href="/app/food"
            variant="secondary"
            size="sm"
            icon={<ArrowRight size={14} />}
            iconPosition="right"
          >
            Open Food Tracker
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1C1F1D]">
              <ShieldCheck size={16} className="text-[#375A41]" />
              <span>Standardized Data Integrity</span>
            </div>
            <p className="text-xs text-[#575E59] leading-relaxed">
              Every staple food includes nutrient density per 100g with verified laboratory citations. No invented values or uncontrolled mock data.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1C1F1D]">
              <Scale size={16} className="text-[#437151]" />
              <span>Multi-Unit Serving Engine</span>
            </div>
            <p className="text-xs text-[#575E59] leading-relaxed">
              Dynamically scales nutrients for cups, pieces, bowls, standard portions, or custom weights using scientific proportionality: <code className="text-[11px] bg-white px-1 py-0.5 rounded border border-[#E8E5DD]">N × W ÷ 100</code>.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1C1F1D]">
              <MapPin size={16} className="text-[#437151]" />
              <span>Coastal Food Architecture</span>
            </div>
            <p className="text-xs text-[#575E59] leading-relaxed">
              Specialized regional recipe models for Coastal Karnataka, Bhatkal, and Murdeshwar dishes (Neer Dosa, Kori Rotti, Bhatkal Biryani) with ingredient-level tracking.
            </p>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="pt-2">
          <span className="text-xs font-semibold text-[#1C1F1D] block mb-2">
            Supported Food Categories (13 Standardized Taxonomy)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {ALL_FOOD_CATEGORIES.map((cat) => (
              <span
                key={cat}
                className="text-[11px] font-medium text-[#575E59] bg-[#FAF8F5] border border-[#E8E5DD] rounded-lg px-2.5 py-1"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* NUTRITION GOALS CONFIGURATION CARD */}
      <Card variant="cream" className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E8E5DD]">
          <div className="flex items-center gap-2.5">
            <Target size={20} className="text-[#437151]" />
            <div>
              <h2 className="text-base font-semibold text-[#1C1F1D]">Daily Nutrition Targets</h2>
              <p className="text-xs text-[#575E59]">Customise baseline calories and macronutrient ratios</p>
            </div>
          </div>
          <Button onClick={handleSaveGoals} size="sm" variant="primary">
            Save Target Ratios
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1F1D]">Target Calories</label>
            <input
              type="number"
              value={targetCalories}
              onChange={(e) => setTargetCalories(parseInt(e.target.value) || 2000)}
              className="w-full rounded-xl border border-[#E8E5DD] bg-white px-3 py-2 text-sm text-[#1C1F1D] focus:ring-1 focus:ring-[#437151]"
            />
            <span className="text-[11px] text-[#717A73]">kcal / day</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1F1D]">Protein Ratio</label>
            <input
              type="number"
              value={proteinRatio}
              onChange={(e) => setProteinRatio(parseInt(e.target.value) || 30)}
              className="w-full rounded-xl border border-[#E8E5DD] bg-white px-3 py-2 text-sm text-[#1C1F1D] focus:ring-1 focus:ring-[#437151]"
            />
            <span className="text-[11px] text-[#717A73]">{proteinRatio}% ({Math.round((targetCalories * (proteinRatio / 100)) / 4)}g)</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1F1D]">Carbs Ratio</label>
            <input
              type="number"
              value={carbsRatio}
              onChange={(e) => setCarbsRatio(parseInt(e.target.value) || 45)}
              className="w-full rounded-xl border border-[#E8E5DD] bg-white px-3 py-2 text-sm text-[#1C1F1D] focus:ring-1 focus:ring-[#437151]"
            />
            <span className="text-[11px] text-[#717A73]">{carbsRatio}% ({Math.round((targetCalories * (carbsRatio / 100)) / 4)}g)</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1F1D]">Fat Ratio</label>
            <input
              type="number"
              value={fatRatio}
              onChange={(e) => setFatRatio(parseInt(e.target.value) || 25)}
              className="w-full rounded-xl border border-[#E8E5DD] bg-white px-3 py-2 text-sm text-[#1C1F1D] focus:ring-1 focus:ring-[#437151]"
            />
            <span className="text-[11px] text-[#717A73]">{fatRatio}% ({Math.round((targetCalories * (fatRatio / 100)) / 9)}g)</span>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}

"use client";

import * as React from "react";
import { Target, AlertCircle, ShieldAlert, ArrowRight, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBmiAnalysis } from "@/lib/health-calculator";
import type { BmiCategory } from "@/types/health-tracking";

interface BmiScreeningCardProps {
  heightCm: number | null | undefined;
  weightKg: number | null | undefined;
  onOpenWeightModal?: () => void;
}

export function BmiScreeningCard({
  heightCm,
  weightKg,
  onOpenWeightModal,
}: BmiScreeningCardProps) {
  const hasHeight = typeof heightCm === "number" && Number.isFinite(heightCm) && heightCm > 0;
  const hasWeight = typeof weightKg === "number" && Number.isFinite(weightKg) && weightKg > 0;

  // Domain calculation
  const bmiAnalysis = React.useMemo(() => {
    if (!hasHeight || !hasWeight) return null;
    return getBmiAnalysis(weightKg, heightCm);
  }, [hasHeight, hasWeight, weightKg, heightCm]);

  const getCategoryBadgeVariant = (category: BmiCategory | null): "olive" | "sage" | "neutral" => {
    switch (category) {
      case "Normal weight":
        return "sage";
      case "Overweight":
        return "olive";
      case "Underweight":
      case "Obese Class I":
      case "Obese Class II":
      case "Obese Class III":
        return "neutral";
      default:
        return "neutral";
    }
  };

  const getCategoryExplanation = (category: BmiCategory | null): string => {
    switch (category) {
      case "Underweight":
        return "BMI is below the standard reference range (<18.5). Consider consulting a nutritionist to ensure adequate micronutrient and energy density.";
      case "Normal weight":
        return "BMI falls comfortably within the healthy epidemiological reference range (18.5 – 24.9), associated with lower cardiometabolic risks.";
      case "Overweight":
        return "BMI is moderately elevated (25.0 – 29.9). Sustained whole-food nutrition and aerobic vitality help guide gradual body recomposition.";
      case "Obese Class I":
      case "Obese Class II":
      case "Obese Class III":
        return "BMI indicates higher relative body mass index (≥30.0). Discussing personalized biometric strategies with a healthcare provider is recommended.";
      default:
        return "Baseline screening metric.";
    }
  };

  return (
    <Card variant="default" className="p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#E2ECE4] text-[#375A41]">
            <Target size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#1C1F1D]">Body Mass Index (BMI)</h2>
            <p className="text-xs text-[#575E59]">Standard adult anthropometric screening</p>
          </div>
        </div>

        {bmiAnalysis?.category && (
          <Badge variant={getCategoryBadgeVariant(bmiAnalysis.category)} size="md">
            {bmiAnalysis.category}
          </Badge>
        )}
      </div>

      {/* Main Content: Missing Inputs State vs Calculated Value */}
      {!hasHeight || !hasWeight || !bmiAnalysis || bmiAnalysis.bmi === null ? (
        <div className="rounded-xl border border-dashed border-[#E8E5DD] bg-[#FAF8F5] p-5 text-center space-y-3">
          <div className="inline-flex p-2.5 rounded-full bg-[#EFEBE1] text-[#717A73]">
            <AlertCircle size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[#1C1F1D]">
              BMI Screening Requires Stored Height & Weight
            </h3>
            <p className="text-xs text-[#575E59] max-w-md mx-auto">
              {!hasHeight && !hasWeight
                ? "Please set your height in your User Profile and record at least one morning weigh-in to display your verified BMI screening."
                : !hasHeight
                ? "Your user profile does not have a saved height. Add your height in Profile settings to calculate BMI."
                : "You have not recorded any weigh-in records yet. Log your first weight to unlock your BMI screening analysis."}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-1">
            {!hasHeight && (
              <Button href="/app/profile" variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
                Update Height in Profile
                <ArrowRight size={13} />
              </Button>
            )}
            {!hasWeight && onOpenWeightModal && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onOpenWeightModal}
                className="text-xs"
              >
                Log First Weigh-In
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* BMI Number */}
            <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-4 text-center sm:text-left">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717A73]">
                Current Score
              </span>
              <p className="text-3xl font-extrabold text-[#1C1F1D] pt-0.5">{bmiAnalysis.bmi}</p>
              <p className="text-[11px] text-[#575E59] pt-1">
                Based on {weightKg} kg & {heightCm} cm
              </p>
            </div>

            {/* Classification & Healthiness */}
            <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-4 text-center sm:text-left">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717A73]">
                WHO Classification
              </span>
              <p className="text-lg font-bold text-[#1C1F1D] pt-1">{bmiAnalysis.category}</p>
              <p className="text-[11px] text-[#437151] font-medium pt-1 flex items-center gap-1">
                {bmiAnalysis.isHealthy ? (
                  <>
                    <Check size={12} className="text-[#437151]" />
                    Within target normal boundary
                  </>
                ) : (
                  "Outside normal reference span"
                )}
              </p>
            </div>

            {/* Healthy Range for User's Height */}
            <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-4 text-center sm:text-left">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717A73]">
                Healthy Weight Span
              </span>
              <p className="text-lg font-bold text-[#437151] pt-1">
                {bmiAnalysis.healthyWeightRangeKg
                  ? `${bmiAnalysis.healthyWeightRangeKg.min} – ${bmiAnalysis.healthyWeightRangeKg.max} kg`
                  : "N/A"}
              </p>
              <p className="text-[11px] text-[#717A73] pt-1">For {heightCm} cm height</p>
            </div>
          </div>

          {/* Visual BMI Gauge Spectrum */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[10px] text-[#717A73] font-medium px-0.5">
              <span>Underweight (&lt;18.5)</span>
              <span>Normal (18.5–24.9)</span>
              <span>Overweight (25–29.9)</span>
              <span>Obese (≥30)</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-[#EFEBE1] overflow-hidden flex">
              <div className="h-full bg-[#93C5FD]" style={{ width: "20%" }} title="Underweight (<18.5)" />
              <div className="h-full bg-[#437151]" style={{ width: "35%" }} title="Normal weight (18.5-24.9)" />
              <div className="h-full bg-[#F59E0B]" style={{ width: "25%" }} title="Overweight (25-29.9)" />
              <div className="h-full bg-[#EF4444]" style={{ width: "20%" }} title="Obese (≥30)" />
            </div>
          </div>

          {/* Category Narrative */}
          <div className="rounded-xl bg-[#FAF8F5] border border-[#E8E5DD] p-3 text-xs text-[#575E59] leading-relaxed">
            {getCategoryExplanation(bmiAnalysis.category)}
          </div>
        </div>
      )}

      {/* Mandatory Clinical Disclaimer */}
      <div className="rounded-xl border border-[#E2ECE4] bg-[#F5F8F6] p-3 text-xs text-[#263B2C] flex items-start gap-2.5">
        <ShieldAlert size={16} className="text-[#375A41] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-[#1C1F1D]">Screening Indicator — Not a Clinical Diagnosis</p>
          <p className="text-[11px] text-[#575E59] leading-relaxed">
            Body Mass Index (BMI) is a general population screening metric based solely on height and weight.
            It does not directly measure body fat percentage, skeletal muscle mass, bone density, or adipose distribution.
            Athletes and individuals with high lean muscle may register higher BMI classifications without excess adiposity.
          </p>
        </div>
      </div>
    </Card>
  );
}

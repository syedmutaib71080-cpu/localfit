"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Target,
  Activity,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Flame,
  Scale,
  Sparkles,
  HeartPulse,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { ActivityLevel, FitnessGoal } from "@/types/database";

const STEPS = [
  { id: 1, title: "Personal Details", icon: User },
  { id: 2, title: "Fitness Goal", icon: Target },
  { id: 3, title: "Activity Level", icon: Activity },
  { id: 4, title: "Review & Confirm", icon: CheckCircle2 },
];

const FITNESS_GOALS: { id: FitnessGoal; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: "lose_weight",
    label: "Lose weight",
    desc: "Sustainable fat reduction with mindful calorie balance",
    icon: <Flame size={20} className="text-[#437151]" />,
  },
  {
    id: "maintain_weight",
    label: "Maintain weight",
    desc: "Maintain your current vitality, weight, and wellness equilibrium",
    icon: <Scale size={20} className="text-[#437151]" />,
  },
  {
    id: "gain_weight",
    label: "Gain weight",
    desc: "Support healthy lean mass gain and strength progression",
    icon: <Sparkles size={20} className="text-[#437151]" />,
  },
  {
    id: "improve_fitness",
    label: "Improve fitness",
    desc: "Enhance stamina, functional mobility, and cardiovascular health",
    icon: <HeartPulse size={20} className="text-[#437151]" />,
  },
];

const ACTIVITY_LEVELS: { id: ActivityLevel; label: string; desc: string; frequency: string }[] = [
  {
    id: "sedentary",
    label: "Sedentary",
    desc: "Desk-based work, minimal daily intentional physical exercise",
    frequency: "< 3,000 steps/day",
  },
  {
    id: "lightly_active",
    label: "Lightly active",
    desc: "Light daily movement or gentle workouts 1–3 days per week",
    frequency: "3,000 – 7,000 steps/day",
  },
  {
    id: "moderately_active",
    label: "Moderately active",
    desc: "Moderate workouts or dedicated fitness sessions 3–5 days per week",
    frequency: "7,000 – 11,000 steps/day",
  },
  {
    id: "very_active",
    label: "Very active",
    desc: "Heavy daily exercise or physically demanding occupational activity",
    frequency: "11,000+ steps/day",
  },
];

export default function OnboardingPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = React.useState("");
  const [age, setAge] = React.useState<string>("");
  const [heightCm, setHeightCm] = React.useState<string>("");
  const [weightKg, setWeightKg] = React.useState<string>("");
  const [gender, setGender] = React.useState<string>("");

  const [fitnessGoal, setFitnessGoal] = React.useState<FitnessGoal>("maintain_weight");
  const [activityLevel, setActivityLevel] = React.useState<ActivityLevel>("moderately_active");

  // Load existing profile / user on mount
  React.useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        setUserId(user.id);

        // Fetch profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          if (profile.onboarding_completed) {
            router.push("/app/dashboard");
            return;
          }
          if (profile.full_name) setFullName(profile.full_name);
          if (profile.age) setAge(String(profile.age));
          if (profile.height_cm) setHeightCm(String(profile.height_cm));
          if (profile.weight_kg) setWeightKg(String(profile.weight_kg));
          if (profile.gender) setGender(profile.gender);
          if (profile.fitness_goal) setFitnessGoal(profile.fitness_goal);
          if (profile.activity_level) setActivityLevel(profile.activity_level);
        } else if (user.user_metadata?.full_name) {
          setFullName(user.user_metadata.full_name);
        }
      } catch {
        // Fallback to local default
      } finally {
        setInitialLoading(false);
      }
    }

    loadUser();
  }, [router]);

  const validateStep1 = () => {
    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return false;
    }
    if (age && (parseInt(age) < 10 || parseInt(age) > 120)) {
      setErrorMessage("Please provide a valid age between 10 and 120.");
      return false;
    }
    if (heightCm && (parseFloat(heightCm) < 50 || parseFloat(heightCm) > 260)) {
      setErrorMessage("Please enter a valid height between 50 cm and 260 cm.");
      return false;
    }
    if (weightKg && (parseFloat(weightKg) < 20 || parseFloat(weightKg) > 400)) {
      setErrorMessage("Please enter a valid weight between 20 kg and 400 kg.");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setErrorMessage(null);
    if (currentStep === 1) {
      if (!validateStep1()) return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();

      const profilePayload = {
        id: userId!,
        full_name: fullName.trim() || null,
        age: age ? parseInt(age) : null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        gender: gender || null,
        fitness_goal: fitnessGoal,
        activity_level: activityLevel,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      router.push("/app/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to save profile.";
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Card variant="default" className="p-8 text-center">
        <Loader2 size={24} className="animate-spin text-[#437151] mx-auto mb-3" />
        <p className="text-sm text-[#575E59]">Preparing your setup space...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Stepper */}
      <div className="bg-[#F5EFEB] rounded-2xl p-3 border border-[#E8E5DD]">
        <div className="flex items-center justify-between text-xs font-semibold text-[#575E59] px-2 mb-2">
          <span>Step {currentStep} of 4: {STEPS[currentStep - 1].title}</span>
          <span>{Math.round((currentStep / 4) * 100)}%</span>
        </div>
        <div className="w-full bg-[#E8E5DD] h-2 rounded-full overflow-hidden">
          <div
            className="bg-[#437151] h-full transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
      </div>

      <Card variant="default" className="shadow-[0_2px_8px_rgba(28,31,29,0.04)]">
        {errorMessage && (
          <div className="p-4 border-b border-red-100 bg-red-50/80 text-xs text-red-800 flex items-center gap-2">
            <AlertCircle size={15} className="text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: PERSONAL DETAILS */}
        {currentStep === 1 && (
          <>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="sage" size="sm">Step 1</Badge>
                <CardTitle className="text-xl">Personal Profile Details</CardTitle>
              </div>
              <CardDescription>
                Tell us a little about yourself so we can personalize your nutrition views.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5]/50 px-3.5 py-2.5 text-sm text-[#1C1F1D] placeholder-[#939D95] focus:outline-none focus:ring-2 focus:ring-[#437151]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="age" className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">
                    Age (years)
                  </label>
                  <input
                    id="age"
                    type="number"
                    min="10"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 29"
                    className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5]/50 px-3.5 py-2.5 text-sm text-[#1C1F1D] placeholder-[#939D95] focus:outline-none focus:ring-2 focus:ring-[#437151]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="heightCm" className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">
                    Height (cm)
                  </label>
                  <input
                    id="heightCm"
                    type="number"
                    step="0.1"
                    min="50"
                    max="260"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="e.g. 175"
                    className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5]/50 px-3.5 py-2.5 text-sm text-[#1C1F1D] placeholder-[#939D95] focus:outline-none focus:ring-2 focus:ring-[#437151]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="weightKg" className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">
                    Weight (kg)
                  </label>
                  <input
                    id="weightKg"
                    type="number"
                    step="0.1"
                    min="20"
                    max="400"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="e.g. 70"
                    className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5]/50 px-3.5 py-2.5 text-sm text-[#1C1F1D] placeholder-[#939D95] focus:outline-none focus:ring-2 focus:ring-[#437151]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="gender" className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">
                  Gender (optional)
                </label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5]/50 px-3.5 py-2.5 text-sm text-[#1C1F1D] focus:outline-none focus:ring-2 focus:ring-[#437151]"
                >
                  <option value="">Prefer not to disclose</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-binary</option>
                </select>
              </div>
            </CardContent>
          </>
        )}

        {/* STEP 2: FITNESS GOAL */}
        {currentStep === 2 && (
          <>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="sage" size="sm">Step 2</Badge>
                <CardTitle className="text-xl">What is your primary fitness goal?</CardTitle>
              </div>
              <CardDescription>
                Select what best reflects your health focus today. You can adjust this anytime in your profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FITNESS_GOALS.map((goal) => {
                const isSelected = fitnessGoal === goal.id;
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => setFitnessGoal(goal.id)}
                    className={`text-left p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? "border-[#437151] bg-[#E2ECE4] shadow-sm"
                        : "border-[#E8E5DD] bg-[#FAF8F5]/60 hover:bg-[#F5EFEB] hover:border-[#D5D0C5]"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-xl bg-white border border-[#E8E5DD]">
                        {goal.icon}
                      </div>
                      <span className="font-semibold text-sm text-[#1C1F1D]">
                        {goal.label}
                      </span>
                    </div>
                    <p className="text-xs text-[#575E59] leading-relaxed">
                      {goal.desc}
                    </p>
                  </button>
                );
              })}
            </CardContent>
          </>
        )}

        {/* STEP 3: ACTIVITY LEVEL */}
        {currentStep === 3 && (
          <>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="sage" size="sm">Step 3</Badge>
                <CardTitle className="text-xl">Your Daily Activity Level</CardTitle>
              </div>
              <CardDescription>
                How much intentional movement or exercise do you typically engage in?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ACTIVITY_LEVELS.map((level) => {
                const isSelected = activityLevel === level.id;
                return (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setActivityLevel(level.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      isSelected
                        ? "border-[#437151] bg-[#E2ECE4] shadow-sm"
                        : "border-[#E8E5DD] bg-[#FAF8F5]/60 hover:bg-[#F5EFEB] hover:border-[#D5D0C5]"
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-sm text-[#1C1F1D] block mb-1">
                        {level.label}
                      </span>
                      <p className="text-xs text-[#575E59]">
                        {level.desc}
                      </p>
                    </div>
                    <Badge variant="outline" size="sm" className="shrink-0">
                      {level.frequency}
                    </Badge>
                  </button>
                );
              })}
            </CardContent>
          </>
        )}

        {/* STEP 4: REVIEW & CONFIRM */}
        {currentStep === 4 && (
          <>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="sage" size="sm">Step 4</Badge>
                <CardTitle className="text-xl">Review Your Details</CardTitle>
              </div>
              <CardDescription>
                Check your initial setup before entering your LocalFit workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-[#E8E5DD] bg-[#FAF8F5] p-4 divide-y divide-[#E8E5DD]">
                <div className="pb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase text-[#717A73]">Full Name</span>
                    <p className="text-sm font-semibold text-[#1C1F1D]">{fullName || "Not provided"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs text-[#437151] hover:underline"
                  >
                    Edit
                  </button>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <span className="text-[11px] font-semibold uppercase text-[#717A73]">Age</span>
                      <p className="text-sm font-semibold text-[#1C1F1D]">{age ? `${age} yrs` : "—"}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold uppercase text-[#717A73]">Height</span>
                      <p className="text-sm font-semibold text-[#1C1F1D]">{heightCm ? `${heightCm} cm` : "—"}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold uppercase text-[#717A73]">Weight</span>
                      <p className="text-sm font-semibold text-[#1C1F1D]">{weightKg ? `${weightKg} kg` : "—"}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs text-[#437151] hover:underline"
                  >
                    Edit
                  </button>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase text-[#717A73]">Fitness Goal</span>
                    <p className="text-sm font-semibold text-[#1C1F1D] capitalize">
                      {fitnessGoal.replace("_", " ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-xs text-[#437151] hover:underline"
                  >
                    Edit
                  </button>
                </div>

                <div className="pt-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase text-[#717A73]">Activity Level</span>
                    <p className="text-sm font-semibold text-[#1C1F1D] capitalize">
                      {activityLevel.replace("_", " ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="text-xs text-[#437151] hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[#C7DBD0] bg-[#E2ECE4]/60 p-3.5 text-xs text-[#263B2C] flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-[#375A41] shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Your baseline preferences are saved locally to your secure profile. You can modify your targets or units at any time from your account settings.
                </p>
              </div>
            </CardContent>
          </>
        )}

        {/* FOOTER ACTIONS */}
        <CardFooter className="justify-between border-t border-[#E8E5DD] pt-4">
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleBack}
              disabled={loading}
              icon={<ArrowLeft size={15} />}
              iconPosition="left"
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleNext}
              icon={<ArrowRight size={15} />}
              iconPosition="right"
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={loading}
              onClick={handleCompleteOnboarding}
              icon={<CheckCircle2 size={15} />}
              iconPosition="right"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Saving Profile...
                </span>
              ) : (
                "Save & Enter Dashboard"
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

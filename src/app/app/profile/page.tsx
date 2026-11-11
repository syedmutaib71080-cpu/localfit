"use client";

import * as React from "react";
import {
  Sparkles,
  CheckCircle2,
  Mail,
  Calendar,
  Edit3,
  Loader2,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/ui/page-container";
import { demoUserProfile, DEMO_DATA_TAG } from "@/lib/demo-data";
import { UserProfileData } from "@/types/demo-data";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const [profile, setProfile] = React.useState<UserProfileData>(demoUserProfile);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [isLiveUser, setIsLiveUser] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [savedSuccess, setSavedSuccess] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchUserProfile() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
          setIsLiveUser(true);

          const { data: dbProfile, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          if (!error && dbProfile) {
            setProfile({
              name: dbProfile.full_name || user.user_metadata?.full_name || "User",
              email: user.email || "user@example.com",
              age: dbProfile.age || 28,
              heightCm: dbProfile.height_cm ? Number(dbProfile.height_cm) : 175,
              weightKg: dbProfile.weight_kg ? Number(dbProfile.weight_kg) : 70,
              goalWeightKg: 68,
              fitnessGoal: dbProfile.fitness_goal
                ? dbProfile.fitness_goal.replace("_", " ")
                : "Maintain vitality & clean energy",
              activityLevel: dbProfile.activity_level
                ? dbProfile.activity_level.replace("_", " ")
                : "Moderately Active",
              joinedDate: new Date(user.created_at).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              }),
            });
          } else {
            // New user without completed profile
            setProfile((prev) => ({
              ...prev,
              name: user.user_metadata?.full_name || prev.name,
              email: user.email || prev.email,
              joinedDate: new Date(user.created_at).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              }),
            }));
          }
        }
      } catch {
        // Fallback to demo data
      } finally {
        setLoading(false);
      }
    }

    fetchUserProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaving(true);

    try {
      if (isLiveUser && userId) {
        const supabase = createClient();

        // Map human readable to database enum if needed
        const sanitizedGoal = profile.fitnessGoal.toLowerCase().replace(/\s+/g, "_");
        const validGoals = ["lose_weight", "maintain_weight", "gain_weight", "improve_fitness"] as const;
        const dbGoal = validGoals.find((g) => g === sanitizedGoal) ?? null;

        const sanitizedActivity = profile.activityLevel.toLowerCase().split(" ")[0];
        const validActivities = ["sedentary", "lightly_active", "moderately_active", "very_active"] as const;
        const dbActivity = validActivities.find((a) => a === sanitizedActivity) ?? null;

        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: profile.name,
            age: Number(profile.age) || null,
            height_cm: Number(profile.heightCm) || null,
            weight_kg: Number(profile.weightKg) || null,
            fitness_goal: dbGoal,
            activity_level: dbActivity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (error) {
          setErrorMessage(error.message);
          setSaving(false);
          return;
        }
      }

      setIsEditing(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer size="wide" className="space-y-8">
        <div className="p-12 text-center text-sm text-[#575E59] flex items-center justify-center gap-2">
          <Loader2 size={18} className="animate-spin text-[#437151]" />
          <span>Loading secure profile...</span>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="wide" className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#E8E5DD]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C7DBD0] bg-[#E2ECE4] px-2.5 py-0.5 text-[11px] font-semibold text-[#263B2C] mb-2">
            {isLiveUser ? (
              <>
                <UserCheck size={12} className="text-[#375A41]" />
                <span>SUPABASE AUTHENTICATED</span>
              </>
            ) : (
              <>
                <Sparkles size={12} className="text-[#375A41]" />
                <span>{DEMO_DATA_TAG}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1F1D]">
            User Profile
          </h1>
          <p className="text-xs sm:text-sm text-[#575E59] mt-0.5">
            Personal biometric attributes, vitality baseline, and fitness targets.
          </p>
        </div>

        <Button
          onClick={() => {
            setIsEditing(!isEditing);
            setErrorMessage(null);
          }}
          size="sm"
          variant={isEditing ? "outline" : "primary"}
          icon={<Edit3 size={15} />}
          iconPosition="left"
        >
          {isEditing ? "Cancel Editing" : "Edit Profile"}
        </Button>
      </div>

      {savedSuccess && (
        <div className="rounded-xl border border-[#C7DBD0] bg-[#E2ECE4] p-3 text-xs font-semibold text-[#263B2C] flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#375A41]" />
          <span>Profile changes saved successfully!</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle size={16} className="text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* AVATAR & IDENTITY BANNER */}
      <Card variant="cream" className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#E2ECE4] border-2 border-[#C7DBD0] text-[#375A41] text-2xl font-bold uppercase">
            {profile.name
              ? profile.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
              : "U"}
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-[#1C1F1D]">{profile.name}</h2>
              <Badge variant="sage" size="sm">
                {isLiveUser ? "Verified Member" : "Prototype Member"}
              </Badge>
            </div>
            <p className="text-xs text-[#575E59] flex items-center gap-1.5">
              <Mail size={13} className="text-[#717A73]" />
              {profile.email}
            </p>
            <p className="text-xs text-[#717A73] flex items-center gap-1.5 pt-0.5">
              <Calendar size={13} className="text-[#717A73]" />
              Member since {profile.joinedDate}
            </p>
          </div>
        </div>
      </Card>

      {/* EDIT PROFILE FORM OR READ-ONLY VIEW */}
      {isEditing ? (
        <Card variant="default" className="p-6 sm:p-8 space-y-6">
          <div className="pb-3 border-b border-[#E8E5DD]">
            <h2 className="text-lg font-semibold text-[#1C1F1D]">Edit Profile Information</h2>
            <p className="text-xs text-[#575E59]">Adjust biometric values and primary wellness ambitions</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1F1D]">Full Name</label>
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1F1D] focus:ring-1 focus:ring-[#437151]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1F1D]">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={profile.email}
                  className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5]/60 px-3.5 py-2.5 text-sm text-[#717A73] cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1F1D]">Age (years)</label>
                <input
                  type="number"
                  min="10"
                  max="120"
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || 25 })}
                  className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1F1D] focus:ring-1 focus:ring-[#437151]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1F1D]">Height (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="50"
                  max="260"
                  value={profile.heightCm}
                  onChange={(e) => setProfile({ ...profile, heightCm: parseFloat(e.target.value) || 170 })}
                  className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1F1D] focus:ring-1 focus:ring-[#437151]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1F1D]">Current Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="400"
                  value={profile.weightKg}
                  onChange={(e) => setProfile({ ...profile, weightKg: parseFloat(e.target.value) || 70 })}
                  className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1F1D] focus:ring-1 focus:ring-[#437151]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1F1D]">Target Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="400"
                  value={profile.goalWeightKg}
                  onChange={(e) => setProfile({ ...profile, goalWeightKg: parseFloat(e.target.value) || 68 })}
                  className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1F1D] focus:ring-1 focus:ring-[#437151]"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1F1D]">Fitness Goal</label>
                <input
                  type="text"
                  value={profile.fitnessGoal}
                  onChange={(e) => setProfile({ ...profile, fitnessGoal: e.target.value })}
                  className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1F1D] focus:ring-1 focus:ring-[#437151]"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1F1D]">Activity Level</label>
                <select
                  value={profile.activityLevel}
                  onChange={(e) => setProfile({ ...profile, activityLevel: e.target.value })}
                  className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1F1D] focus:ring-1 focus:ring-[#437151]"
                >
                  <option value="sedentary">Sedentary (desk job, minimal movement)</option>
                  <option value="lightly active">Lightly Active (1–3 walks/workouts per week)</option>
                  <option value="moderately active">Moderately Active (3–5 workouts/week)</option>
                  <option value="very active">Very Active (intense training daily)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#E8E5DD]">
              <Button
                type="button"
                onClick={() => setIsEditing(false)}
                variant="outline"
                size="md"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={saving}
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Saving changes...
                  </span>
                ) : (
                  "Save Profile Changes"
                )}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        /* READ-ONLY BIOMETRICS DISPLAY */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card variant="default" className="p-5 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#717A73]">Age & Vitality</span>
            <p className="text-2xl font-bold text-[#1C1F1D]">{profile.age} years</p>
            <p className="text-xs text-[#575E59]">Baseline metabolic rate ~1,740 kcal</p>
          </Card>

          <Card variant="default" className="p-5 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#717A73]">Height</span>
            <p className="text-2xl font-bold text-[#1C1F1D]">{profile.heightCm} cm</p>
            <p className="text-xs text-[#575E59]">5 ft 9 inches equivalent</p>
          </Card>

          <Card variant="default" className="p-5 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#717A73]">Current Weight</span>
            <p className="text-2xl font-bold text-[#437151]">{profile.weightKg} kg</p>
            <p className="text-xs text-[#575E59]">Target: {profile.goalWeightKg} kg (-{(profile.weightKg - profile.goalWeightKg).toFixed(1)} kg)</p>
          </Card>

          <Card variant="default" className="sm:col-span-2 lg:col-span-2 p-5 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#717A73]">Fitness Goal</span>
            <p className="text-base font-semibold text-[#1C1F1D] capitalize">{profile.fitnessGoal}</p>
            <p className="text-xs text-[#575E59]">Prioritizes functional strength, body symmetry, and clean micronutrient density.</p>
          </Card>

          <Card variant="default" className="p-5 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#717A73]">Activity Level</span>
            <p className="text-sm font-semibold text-[#1C1F1D] capitalize">{profile.activityLevel}</p>
            <p className="text-xs text-[#575E59]">10,000 steps daily baseline</p>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}

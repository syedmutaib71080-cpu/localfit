"use client";

import * as React from "react";
import {
  Utensils,
  Scan,
  Activity,
  AlertCircle,
  LogIn,
} from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DashboardDateBar,
  DashboardOverviewCards,
  DashboardGoalsCard,
  DashboardNutritionSummary,
  DashboardActivitySummary,
  DashboardTrendCharts,
} from "@/components/dashboard";
import { createClient } from "@/lib/supabase/client";
import {
  getTodayDateString,
  shiftDateString,
  fetchDailyFoodLogs,
} from "@/lib/nutrition-client";
import {
  fetchWorkouts,
  fetchDailySteps,
  fetchStepsRange,
  computeDailyActivitySummary,
  computeWeeklySummary,
} from "@/lib/activity-client";
import {
  fetchFoodLogsRange,
  computeWeeklyNutritionSummary,
} from "@/lib/dashboard-calculator";
import type { FoodLogEntry, DailyNutritionTotals } from "@/types/nutrition-tracking";
import type { ActivityWorkout, DailyStepEntry, DailyActivitySummary, WeeklyDaySummary } from "@/types/activity";
import type { UserProfileGoals, WeeklyNutritionDay } from "@/lib/dashboard-calculator";

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = React.useState<string>(getTodayDateString);
  const [userName, setUserName] = React.useState<string>("User");
  const [userGoals, setUserGoals] = React.useState<UserProfileGoals>({});
  const [isUnauthorized, setIsUnauthorized] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Nutrition state for selectedDate
  const [foodLogs, setFoodLogs] = React.useState<FoodLogEntry[]>([]);
  const [nutritionTotals, setNutritionTotals] = React.useState<DailyNutritionTotals | null>(null);

  // Nutrition 7-day range state for weekly trend
  const [weeklyNutrition, setWeeklyNutrition] = React.useState<WeeklyNutritionDay[]>([]);

  // Activity state
  const [workouts, setWorkouts] = React.useState<ActivityWorkout[]>([]);
  const [stepsList, setStepsList] = React.useState<DailyStepEntry[]>([]);
  const [weeklyStepsRange, setWeeklyStepsRange] = React.useState<DailyStepEntry[]>([]);

  // 1. Load User Profile & Goals on Mount
  React.useEffect(() => {
    let isMounted = true;

    async function loadUserProfile() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          if (isMounted) {
            setIsUnauthorized(true);
            setIsLoading(false);
          }
          return;
        }

        if (isMounted) {
          setIsUnauthorized(false);
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, daily_calorie_goal, daily_protein_goal")
          .eq("id", user.id)
          .maybeSingle();

        if (isMounted) {
          if (profile?.full_name) {
            setUserName(profile.full_name);
          } else if (user.user_metadata?.full_name) {
            setUserName(user.user_metadata.full_name);
          } else if (user.email) {
            setUserName(user.email.split("@")[0]);
          }

          if (profile) {
            setUserGoals({
              daily_calorie_goal: profile.daily_calorie_goal,
              daily_protein_goal: profile.daily_protein_goal,
            });
          }
        }
      } catch {
        // Fallback handled
      }
    }

    loadUserProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Day & Trend Data whenever selectedDate changes
  React.useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      const sevenDaysAgo = shiftDateString(selectedDate, -6);

      try {
        // Parallel execution of all 5 independent data calls
        const [
          dailyFoodResult,
          rangeFoodResult,
          allWorkouts,
          daySteps,
          rangeSteps,
        ] = await Promise.all([
          fetchDailyFoodLogs(selectedDate),
          fetchFoodLogsRange(sevenDaysAgo, selectedDate),
          fetchWorkouts(),
          fetchDailySteps(selectedDate),
          fetchStepsRange(sevenDaysAgo, selectedDate),
        ]);

        if (!isMounted) return;

        if (dailyFoodResult.unauthorized) {
          setIsUnauthorized(true);
          setIsLoading(false);
          return;
        }

        setFoodLogs(dailyFoodResult.logs);
        setNutritionTotals(dailyFoodResult.totals);

        // Compute 7-day nutrition summary
        const weeklyNutr = computeWeeklyNutritionSummary(selectedDate, rangeFoodResult.logs);
        setWeeklyNutrition(weeklyNutr);

        setWorkouts(allWorkouts);
        setStepsList(daySteps);
        setWeeklyStepsRange(rangeSteps);
      } catch (err) {
        if (isMounted) {
          setErrorMessage(
            err instanceof Error ? err.message : "Failed to load dashboard metrics. Please try again."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  // Compute daily activity summary strictly for selectedDate
  const dailyActivity: DailyActivitySummary = React.useMemo(() => {
    return computeDailyActivitySummary(selectedDate, workouts, stepsList);
  }, [selectedDate, workouts, stepsList]);

  // Compute 7-day weekly activity summary leading up to selectedDate
  const weeklyActivity: WeeklyDaySummary[] = React.useMemo(() => {
    return computeWeeklySummary(workouts, weeklyStepsRange, selectedDate);
  }, [workouts, weeklyStepsRange, selectedDate]);

  const handleDateChange = React.useCallback((newDate: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSelectedDate(newDate);
  }, []);

  // Handle Unauthenticated State
  if (isUnauthorized) {
    return (
      <PageContainer size="wide" className="py-12">
        <Card variant="cream" className="p-8 text-center max-w-lg mx-auto space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#E2ECE4] border border-[#C7DBD0] flex items-center justify-center text-[#437151]">
            <LogIn size={22} />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-[#1C1F1D]">Sign in to View Your Dashboard</h1>
            <p className="text-xs text-[#575E59]">
              LocalFit secures your nutrition, activity, and goals with authenticated database isolation.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Button href="/login" variant="primary" size="md">
              Sign In
            </Button>
            <Button href="/register" variant="outline" size="md">
              Create Account
            </Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="wide" className="space-y-8">
      {/* Top Banner & Personal Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#E8E5DD]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C7DBD0] bg-[#E2ECE4] px-2.5 py-0.5 text-[11px] font-semibold text-[#263B2C] mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#437151]" />
            <span>Unified Health Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1F1D]">
            Welcome back, {userName}
          </h1>
          <p className="text-xs sm:text-sm text-[#575E59] mt-0.5">
            Your single place for daily nutrition, active movement, and profile goals.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            href="/app/food/scan"
            size="sm"
            variant="primary"
            icon={<Scan size={14} />}
            iconPosition="left"
          >
            Scan Food
          </Button>
          <Button
            href="/app/food"
            size="sm"
            variant="secondary"
            icon={<Utensils size={14} />}
            iconPosition="left"
          >
            Log Meal
          </Button>
          <Button
            href="/app/workouts"
            size="sm"
            variant="outline"
            icon={<Activity size={14} />}
            iconPosition="left"
          >
            Start Workout
          </Button>
        </div>
      </div>

      {/* Date Navigation Bar (All sections sync to selectedDate) */}
      <DashboardDateBar
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        disabled={isLoading}
      />

      {/* Error Notice */}
      {errorMessage && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-amber-700 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateChange(selectedDate)}
            className="text-xs h-7 px-2"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-36 rounded-xl bg-[#EFEBE1] border border-[#E8E5DD]" />
            ))}
          </div>
          <div className="h-44 rounded-xl bg-[#EFEBE1] border border-[#E8E5DD]" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72 rounded-xl bg-[#EFEBE1] border border-[#E8E5DD]" />
            <div className="h-72 rounded-xl bg-[#EFEBE1] border border-[#E8E5DD]" />
          </div>
        </div>
      ) : (
        <>
          {/* 1. Primary Overview Metric Cards */}
          <DashboardOverviewCards
            totals={nutritionTotals}
            activity={dailyActivity}
            userGoals={userGoals}
          />

          {/* 2. Daily Health Goals Card (Evaluated strictly against real profile settings) */}
          <DashboardGoalsCard
            userGoals={userGoals}
            consumedCalories={nutritionTotals?.totalCalories ?? 0}
            consumedProtein={nutritionTotals?.totalProtein ?? 0}
            totalSteps={dailyActivity.total_steps}
            activeSeconds={dailyActivity.total_workout_duration_seconds}
          />

          {/* 3. Nutrition & Activity Summaries Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Nutrition Summary (Stage 9 + 10) */}
            <DashboardNutritionSummary
              logs={foodLogs}
              totals={nutritionTotals}
              userGoals={userGoals}
              selectedDate={selectedDate}
            />

            {/* Right: Activity & Workouts Summary (Stage 8) */}
            <DashboardActivitySummary
              workouts={workouts}
              stepsList={stepsList}
              summary={dailyActivity}
              selectedDate={selectedDate}
            />
          </div>

          {/* 4. 7-Day Trend Charts (Calorie intake, active duration, daily steps) */}
          <DashboardTrendCharts
            weeklyNutrition={weeklyNutrition}
            weeklyActivity={weeklyActivity}
            calorieTarget={
              typeof userGoals.daily_calorie_goal === "number" && userGoals.daily_calorie_goal > 0
                ? userGoals.daily_calorie_goal
                : null
            }
            selectedDate={selectedDate}
          />
        </>
      )}
    </PageContainer>
  );
}

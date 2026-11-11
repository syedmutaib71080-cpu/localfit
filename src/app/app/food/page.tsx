"use client";

import * as React from "react";
import {
  Sparkles,
  Check,
  AlertCircle,
  Scan,
  PenTool,
  Compass,
  Loader2,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import {
  NutritionDashboardHeader,
  DateNavigationBar,
  MealBreakdownCard,
  FoodSearchModal,
  FoodDetailModal,
  EditFoodLogModal,
  ManualFoodModal,
  DeleteConfirmationDialog,
} from "@/components/food";
import {
  getTodayDateString,
  fetchDailyFoodLogs,
  createFoodLog,
  updateFoodLog,
  deleteFoodLog,
  filterLogsByMeal,
} from "@/lib/nutrition-client";
import { createClient } from "@/lib/supabase/client";
import type {
  FoodCatalogueItem,
  FoodLogEntry,
  DailyNutritionTotals,
  CreateFoodLogRequest,
  UpdateFoodLogRequest,
  MealType,
} from "@/types/nutrition-tracking";

export default function FoodTrackerPage() {
  const [selectedDate, setSelectedDate] = React.useState<string>(getTodayDateString);
  const [logs, setLogs] = React.useState<FoodLogEntry[]>([]);
  const [totals, setTotals] = React.useState<DailyNutritionTotals | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = React.useState(true);
  const [isUnauthorized, setIsUnauthorized] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = React.useState<string | null>(null);

  // User goals from profile (strictly real goals; no fabricated fallbacks)
  const [userGoals, setUserGoals] = React.useState<{
    daily_calorie_goal?: number | null;
    daily_protein_goal?: number | null;
  }>({});

  // Modals & interaction state
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [activeMealCategory, setActiveMealCategory] = React.useState<MealType>("breakfast");
  const [selectedFoodForDetail, setSelectedFoodForDetail] = React.useState<FoodCatalogueItem | null>(null);
  const [editingLog, setEditingLog] = React.useState<FoodLogEntry | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = React.useState(false);
  const [deletingLog, setDeletingLog] = React.useState<FoodLogEntry | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // 1. Load user profile goals
  React.useEffect(() => {
    async function loadGoals() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("daily_calorie_goal, daily_protein_goal")
            .eq("id", user.id)
            .maybeSingle();

          if (profile) {
            setUserGoals({
              daily_calorie_goal: profile.daily_calorie_goal,
              daily_protein_goal: profile.daily_protein_goal,
            });
          }
        }
      } catch {
        // Leave goals empty without fabricating numbers
      }
    }
    loadGoals();
  }, []);

  // 2. Fetch food logs whenever selectedDate changes
  const reloadCurrentDate = React.useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetchDailyFoodLogs(selectedDate);
      if (res.unauthorized) {
        setIsUnauthorized(true);
        setLogs([]);
        setTotals(null);
      } else if (res.error) {
        setErrorMessage(res.error);
        setLogs([]);
        setTotals(null);
      } else {
        setIsUnauthorized(false);
        setLogs(res.logs);
        setTotals(res.totals);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load nutrition logs.");
    } finally {
      setIsLoadingLogs(false);
    }
  }, [selectedDate]);

  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const res = await fetchDailyFoodLogs(selectedDate);
        if (!isMounted) return;
        if (res.unauthorized) {
          setIsUnauthorized(true);
          setLogs([]);
          setTotals(null);
        } else if (res.error) {
          setErrorMessage(res.error);
          setLogs([]);
          setTotals(null);
        } else {
          setIsUnauthorized(false);
          setLogs(res.logs);
          setTotals(res.totals);
        }
      } catch (err) {
        if (!isMounted) return;
        setErrorMessage(err instanceof Error ? err.message : "Failed to load nutrition logs.");
      } finally {
        if (isMounted) {
          setIsLoadingLogs(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  // Show temporary feedback toast
  const showFeedback = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => {
      setFeedbackNotice(null);
    }, 3500);
  };

  // Add food flow
  const handleOpenAddFood = (mealType: MealType) => {
    setActiveMealCategory(mealType);
    setIsSearchOpen(true);
  };

  const handleSelectFoodFromSearch = (food: FoodCatalogueItem) => {
    setIsSearchOpen(false);
    setSelectedFoodForDetail(food);
  };

  const handleLogFromDetail = async (payload: CreateFoodLogRequest): Promise<{ success: boolean; error?: string }> => {
    const res = await createFoodLog({
      ...payload,
      consumption_date: selectedDate,
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    // Refresh logs and authoritative totals
    await reloadCurrentDate();
    const mealLabel = payload.meal_type.charAt(0).toUpperCase() + payload.meal_type.slice(1);
    showFeedback(`Added "${payload.food_name}" to ${mealLabel}`);
    return { success: true };
  };

  const handleLogManualFood = async (payload: CreateFoodLogRequest): Promise<{ success: boolean; error?: string }> => {
    const res = await createFoodLog({
      ...payload,
      consumption_date: selectedDate,
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    await reloadCurrentDate();
    const mealLabel = payload.meal_type.charAt(0).toUpperCase() + payload.meal_type.slice(1);
    showFeedback(`Added personal custom entry "${payload.food_name}" to ${mealLabel}`);
    return { success: true };
  };

  // Edit food flow
  const handleUpdateLog = async (
    id: string,
    updates: UpdateFoodLogRequest
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await updateFoodLog(id, {
      ...updates,
      consumption_date: selectedDate,
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    await reloadCurrentDate();
    showFeedback(`Updated "${res.log?.food_name || "food entry"}"`);
    return { success: true };
  };

  // Delete food flow
  const handleOpenDelete = (entry: FoodLogEntry) => {
    setDeletingLog(entry);
  };

  const handleConfirmDelete = async () => {
    if (!deletingLog) return;
    setIsDeleting(true);

    const res = await deleteFoodLog(deletingLog.id);
    setIsDeleting(false);

    if (!res.success) {
      setErrorMessage(res.error || "Failed to delete food entry.");
      return;
    }

    setDeletingLog(null);
    await reloadCurrentDate();
    showFeedback("Food log entry removed");
  };

  // Group logs by meal type
  const breakfastLogs = filterLogsByMeal(logs, "breakfast");
  const lunchLogs = filterLogsByMeal(logs, "lunch");
  const dinnerLogs = filterLogsByMeal(logs, "dinner");
  const snackLogs = filterLogsByMeal(logs, "snack");

  return (
    <PageContainer size="wide" className="space-y-8">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#E8E5DD]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C7DBD0] bg-[#E2ECE4] px-2.5 py-0.5 text-[11px] font-semibold text-[#263B2C] mb-2">
            <Sparkles size={12} className="text-[#375A41]" />
            <span>Daily Nutrition Logs</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1F1D]">
            Daily Food Tracker
          </h1>
          <p className="text-xs sm:text-sm text-[#575E59] mt-0.5">
            Log whole foods, monitor macro balances, and calibrate daily nourishment.
          </p>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <DateNavigationBar
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            disabled={isLoadingLogs}
          />

          <Button
            type="button"
            onClick={() => {
              setActiveMealCategory("breakfast");
              setIsManualModalOpen(true);
            }}
            size="sm"
            variant="secondary"
            icon={<PenTool size={14} />}
            iconPosition="left"
            className="text-xs"
          >
            Custom Entry
          </Button>

          <Button
            href="/app/regional"
            size="sm"
            variant="outline"
            icon={<Compass size={14} className="text-[#437151]" />}
            iconPosition="left"
            className="text-xs"
          >
            Regional Heritage
          </Button>

          <Button
            href="/app/food/scan"
            size="sm"
            variant="primary"
            icon={<Scan size={15} />}
            iconPosition="left"
            className="text-xs"
          >
            AI Camera Scan
          </Button>
        </div>
      </div>

      {/* Success Feedback Toast */}
      {feedbackNotice && (
        <div className="rounded-xl border border-[#C7DBD0] bg-[#E2ECE4] p-3 text-xs font-medium text-[#263B2C] flex items-center gap-2 animate-in fade-in-50 duration-200">
          <Check size={16} className="text-[#375A41] shrink-0" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="rounded-xl border border-[#FCA5A5] bg-[#FEE2E2] p-3 text-xs font-semibold text-[#B91C1C] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs underline hover:text-[#7F1D1D]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Unauthenticated notice */}
      {isUnauthorized && (
        <div className="p-6 rounded-2xl border border-[#E8D49E] bg-[#FDF6E2] text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5E6BF] text-[#8F5E16] mx-auto">
            <LogIn size={22} />
          </div>
          <h3 className="text-base font-semibold text-[#1C1F1D]">Sign In to Track Nutrition</h3>
          <p className="text-xs text-[#575E59] max-w-md mx-auto">
            Your daily food logs and nutrition totals are securely synchronized with your authenticated account.
          </p>
          <div className="pt-1">
            <Button href="/login" variant="primary" size="sm">
              Sign In to Your Account
            </Button>
          </div>
        </div>
      )}

      {/* Nutrition Dashboard Card */}
      {!isUnauthorized && (
        <NutritionDashboardHeader
          selectedDate={selectedDate}
          totals={totals}
          userGoals={userGoals}
        />
      )}

      {/* 4 Meal Breakdown Cards */}
      {!isUnauthorized && (
        <div className="space-y-6">
          {isLoadingLogs ? (
            <div className="p-12 text-center text-xs text-[#717A73] border border-[#E8E5DD] rounded-2xl bg-white flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-[#437151]" />
              <span>Loading food logs for {selectedDate}...</span>
            </div>
          ) : (
            <>
              <MealBreakdownCard
                mealType="breakfast"
                displayTitle="Breakfast"
                entries={breakfastLogs}
                onAddFood={handleOpenAddFood}
                onEditEntry={setEditingLog}
                onDeleteEntry={handleOpenDelete}
              />
              <MealBreakdownCard
                mealType="lunch"
                displayTitle="Lunch"
                entries={lunchLogs}
                onAddFood={handleOpenAddFood}
                onEditEntry={setEditingLog}
                onDeleteEntry={handleOpenDelete}
              />
              <MealBreakdownCard
                mealType="dinner"
                displayTitle="Dinner"
                entries={dinnerLogs}
                onAddFood={handleOpenAddFood}
                onEditEntry={setEditingLog}
                onDeleteEntry={handleOpenDelete}
              />
              <MealBreakdownCard
                mealType="snack"
                displayTitle="Snacks"
                entries={snackLogs}
                onAddFood={handleOpenAddFood}
                onEditEntry={setEditingLog}
                onDeleteEntry={handleOpenDelete}
              />
            </>
          )}
        </div>
      )}

      {/* MODALS */}

      {/* 1. Food Catalogue Search Modal */}
      <FoodSearchModal
        isOpen={isSearchOpen}
        activeMealType={activeMealCategory}
        onClose={() => setIsSearchOpen(false)}
        onSelectFood={handleSelectFoodFromSearch}
        onOpenManualEntry={() => {
          setIsSearchOpen(false);
          setIsManualModalOpen(true);
        }}
      />

      {/* 2. Food Detail & Portion Selector Modal */}
      <FoodDetailModal
        food={selectedFoodForDetail}
        defaultMealType={activeMealCategory}
        isOpen={Boolean(selectedFoodForDetail)}
        onClose={() => setSelectedFoodForDetail(null)}
        onLogMeal={handleLogFromDetail}
      />

      {/* 3. Edit Food Log Modal */}
      <EditFoodLogModal
        log={editingLog}
        isOpen={Boolean(editingLog)}
        onClose={() => setEditingLog(null)}
        onUpdate={handleUpdateLog}
        onDelete={handleOpenDelete}
      />

      {/* 4. Manual Custom Food Modal */}
      <ManualFoodModal
        isOpen={isManualModalOpen}
        defaultMealType={activeMealCategory}
        onClose={() => setIsManualModalOpen(false)}
        onSubmit={handleLogManualFood}
      />

      {/* 5. Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={Boolean(deletingLog)}
        foodName={deletingLog?.food_name || "this food entry"}
        isDeleting={isDeleting}
        onCancel={() => setDeletingLog(null)}
        onConfirm={handleConfirmDelete}
      />
    </PageContainer>
  );
}

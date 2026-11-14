"use client";

import * as React from "react";
import {
  Sparkles,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Flame,
  Dumbbell,
  Clock,
  Utensils,
  Info,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  MealCategory,
  MealSuggestionItem,
  MealSuggestionsSummary,
  MealSuggestionsResponse,
} from "@/types/meal-suggestions";

const CATEGORIES: Array<MealCategory | "All"> = [
  "All",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snacks",
];

export function MealSuggestionsCard() {
  const [suggestions, setSuggestions] = React.useState<MealSuggestionItem[]>([]);
  const [summary, setSummary] = React.useState<MealSuggestionsSummary | null>(null);
  const [activeCategory, setActiveCategory] = React.useState<MealCategory | "All">("All");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshCount, setRefreshCount] = React.useState(0);

  // Confirmation dialog state for logging to diary
  const [confirmItem, setConfirmItem] = React.useState<MealSuggestionItem | null>(null);
  const [confirmMealType, setConfirmMealType] = React.useState<string>("Lunch");
  const [isLogging, setIsLogging] = React.useState(false);
  const [logError, setLogError] = React.useState<string | null>(null);
  const [loggedIds, setLoggedIds] = React.useState<Set<string>>(new Set());
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const res = await fetch("/api/ai/meal-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mealCategory: activeCategory,
            timezone: clientTz,
          }),
        });

        const data = (await res.json()) as MealSuggestionsResponse;
        if (isCancelled) return;

        if (!res.ok || !data.success) {
          setError(data.message || "Failed to load meal suggestions.");
          return;
        }

        setSuggestions(data.suggestions || []);
        setSummary(data.summary || null);
      } catch (err: unknown) {
        if (isCancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Network error while connecting to meal suggestions service."
        );
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [activeCategory, refreshCount]);

  const handleCategoryChange = (cat: MealCategory | "All") => {
    setActiveCategory(cat);
    setLoading(true);
    setError(null);
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    setRefreshCount((c) => c + 1);
  };

  const handleOpenConfirm = (item: MealSuggestionItem) => {
    setConfirmItem(item);
    setConfirmMealType(item.meal_category);
    setLogError(null);
  };

  const handleCloseConfirm = () => {
    if (isLogging) return;
    setConfirmItem(null);
    setLogError(null);
  };

  // Keyboard accessibility: ESC key to dismiss modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && confirmItem && !isLogging) {
        setConfirmItem(null);
        setLogError(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmItem, isLogging]);

  const handleExecuteLog = async () => {
    if (!confirmItem) return;

    setIsLogging(true);
    setLogError(null);

    try {
      const todayStr =
        summary?.target_date || new Date().toISOString().split("T")[0];

      // Use standard food-logs API with server-side nutrient calculation
      const payload = {
        food_id: confirmItem.catalogue_id || null,
        food_name: confirmItem.food_name,
        meal_type: confirmMealType.toLowerCase(),
        quantity_g: confirmItem.portion_grams,
        serving_name: confirmItem.serving_size,
        consumption_date: todayStr,
        logged_at: new Date().toISOString(),
        notes: `Suggested via AI (${confirmItem.is_verified ? "Verified Catalogue" : "AI Estimate"})`,
        // Send baseline per 100g if custom estimate
        calories_per_100g:
          confirmItem.portion_grams > 0
            ? (confirmItem.calories / confirmItem.portion_grams) * 100
            : null,
        protein_per_100g:
          confirmItem.portion_grams > 0
            ? (confirmItem.protein_g / confirmItem.portion_grams) * 100
            : null,
        carbohydrates_per_100g:
          confirmItem.portion_grams > 0
            ? (confirmItem.carbs_g / confirmItem.portion_grams) * 100
            : null,
        fat_per_100g:
          confirmItem.portion_grams > 0
            ? (confirmItem.fat_g / confirmItem.portion_grams) * 100
            : null,
      };

      const res = await fetch("/api/food/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json().catch(() => null);

      if (!res.ok) {
        setLogError(
          resData?.error || "Failed to log meal to food diary. Please try again."
        );
        return;
      }

      // Mark item as logged
      setLoggedIds((prev) => new Set([...prev, confirmItem.id]));
      setSuccessBanner(
        `Successfully logged ${confirmItem.food_name} (${confirmMealType}) to your food diary!`
      );
      setTimeout(() => setSuccessBanner(null), 4000);
      setConfirmItem(null);
    } catch (err: unknown) {
      setLogError(
        err instanceof Error
          ? err.message
          : "Network error occurred while logging meal."
      );
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <Card variant="default" className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E5DD]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E2ECE4] text-[#375A41] border border-[#C7DBD0]">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#1C1F1D]">
                Personalized Meal Suggestions
              </h2>
              <Badge variant="sage" size="sm">
                Stage 10.3
              </Badge>
            </div>
            <p className="text-xs text-[#575E59]">
              Nutrient-balanced meal recommendations tailored to your daily targets and logged diary
            </p>
          </div>
        </div>

        <Button
          onClick={handleRefresh}
          disabled={loading}
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
        >
          {loading ? "Refreshing..." : "Refresh Suggestions"}
        </Button>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#E2ECE4] text-[#2C4A35] border border-[#C7DBD0] text-xs">
          <CheckCircle2 size={16} className="text-[#375A41] shrink-0" />
          <span className="font-medium">{successBanner}</span>
        </div>
      )}

      {/* Nutritional Target vs Consumed Summary Bar */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E5DD]">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#717A73] flex items-center gap-1.5">
                <Flame size={14} className="text-[#C15C3D]" />
                Daily Calories
              </span>
              <span className="font-semibold text-[#1C1F1D]">
                {summary.calories_consumed}
                {summary.calorie_goal !== null ? ` / ${summary.calorie_goal}` : ""} kcal
              </span>
            </div>
            {summary.calories_remaining !== null && (
              <span className="text-[11px] text-[#437151] font-medium block">
                {summary.calories_remaining} kcal remaining
              </span>
            )}
            {summary.calorie_goal === null && (
              <span className="text-[11px] text-[#717A73] block">Goal not configured</span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#717A73] flex items-center gap-1.5">
                <Dumbbell size={14} className="text-[#437151]" />
                Daily Protein
              </span>
              <span className="font-semibold text-[#1C1F1D]">
                {summary.protein_consumed}
                {summary.protein_goal !== null ? ` / ${summary.protein_goal}` : ""}g
              </span>
            </div>
            {summary.protein_remaining !== null && (
              <span className="text-[11px] text-[#437151] font-medium block">
                {summary.protein_remaining}g remaining
              </span>
            )}
            {summary.protein_goal === null && (
              <span className="text-[11px] text-[#717A73] block">Goal not configured</span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#717A73] flex items-center gap-1.5">
                <Utensils size={14} className="text-[#6B7546]" />
                Logged Meals Today
              </span>
              <span className="font-semibold text-[#1C1F1D]">
                {summary.logged_meal_count} meals
              </span>
            </div>
            <span className="text-[11px] text-[#717A73] block">
              Suggestions avoid dishes you already had today
            </span>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => handleCategoryChange(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeCategory === cat
                ? "bg-[#375A41] text-white shadow-sm"
                : "bg-[#FAF8F5] text-[#575E59] border border-[#E8E5DD] hover:bg-[#EFEBE1] hover:text-[#1C1F1D]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3 py-4">
          <div className="flex items-center justify-center gap-2 text-xs text-[#717A73]">
            <RefreshCw size={14} className="animate-spin text-[#437151]" />
            <span>Analyzing your nutrition budget and preparing meal suggestions...</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-44 rounded-xl border border-[#E8E5DD] bg-[#FAF8F5]/60 animate-pulse"
              />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-4 rounded-xl border border-[#F3C4B8] bg-[#FDF3F0] space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#A63A20]">
            <AlertCircle size={16} />
            <span>Unable to load meal suggestions</span>
          </div>
          <p className="text-xs text-[#717A73]">{error}</p>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && suggestions.length === 0 && (
        <div className="p-6 text-center rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] space-y-2">
          <Utensils size={24} className="mx-auto text-[#717A73]" />
          <h3 className="text-sm font-semibold text-[#1C1F1D]">No Suggestions Available</h3>
          <p className="text-xs text-[#717A73] max-w-md mx-auto">
            Try switching to another meal category or refresh to generate fresh ideas.
          </p>
        </div>
      )}

      {/* Suggestions Grid */}
      {!loading && !error && suggestions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestions.map((item) => {
            const isAlreadyLogged = loggedIds.has(item.id);

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-[#E8E5DD] bg-white hover:border-[#C7DBD0] transition-all space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  {/* Category and Verification Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#375A41] uppercase tracking-wider bg-[#E2ECE4] px-2 py-0.5 rounded-md">
                      {item.meal_category}
                    </span>

                    {item.is_verified ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-[#2C4A35] bg-[#E2ECE4] px-2 py-0.5 rounded-md border border-[#C7DBD0]">
                        <ShieldCheck size={13} className="text-[#375A41]" />
                        Verified Food
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-[#8C6D23] bg-[#FEF7E6] px-2 py-0.5 rounded-md border border-[#FBE0A6]">
                        <Sparkles size={13} className="text-[#B58514]" />
                        AI Estimate
                      </span>
                    )}
                  </div>

                  {/* Food Name & Local Name */}
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1F1D]">
                      {item.food_name}
                    </h3>
                    {item.local_name && (
                      <span className="text-xs text-[#717A73] italic">
                        {item.local_name}
                      </span>
                    )}
                  </div>

                  {/* Serving Size */}
                  <div className="text-xs text-[#575E59] flex items-center gap-1">
                    <Clock size={13} className="text-[#717A73]" />
                    <span>Serving: {item.serving_size}</span>
                  </div>

                  {/* Macro Pills */}
                  <div className="grid grid-cols-4 gap-1.5 py-1">
                    <div className="p-1.5 rounded-lg bg-[#FAF8F5] text-center border border-[#E8E5DD]">
                      <span className="text-[10px] text-[#717A73] block">Calories</span>
                      <span className="text-xs font-bold text-[#1C1F1D]">
                        {item.calories}
                      </span>
                    </div>

                    <div className="p-1.5 rounded-lg bg-[#FAF8F5] text-center border border-[#E8E5DD]">
                      <span className="text-[10px] text-[#717A73] block">Protein</span>
                      <span className="text-xs font-bold text-[#437151]">
                        {item.protein_g}g
                      </span>
                    </div>

                    <div className="p-1.5 rounded-lg bg-[#FAF8F5] text-center border border-[#E8E5DD]">
                      <span className="text-[10px] text-[#717A73] block">Carbs</span>
                      <span className="text-xs font-bold text-[#575E59]">
                        {item.carbs_g}g
                      </span>
                    </div>

                    <div className="p-1.5 rounded-lg bg-[#FAF8F5] text-center border border-[#E8E5DD]">
                      <span className="text-[10px] text-[#717A73] block">Fat</span>
                      <span className="text-xs font-bold text-[#575E59]">
                        {item.fat_g}g
                      </span>
                    </div>
                  </div>

                  {/* Why Suggested */}
                  <p className="text-xs text-[#575E59] leading-relaxed bg-[#FAF8F5] p-2.5 rounded-lg border border-[#E8E5DD]">
                    <span className="font-semibold text-[#1C1F1D]">Why this meal: </span>
                    {item.why_suggested}
                  </p>
                </div>

                {/* Log to Diary Action Button */}
                <div className="pt-2 border-t border-[#E8E5DD] flex items-center justify-between">
                  <span className="text-[10px] text-[#717A73] flex items-center gap-1">
                    <Info size={11} />
                    Requires confirmation
                  </span>

                  {isAlreadyLogged ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-[#375A41]">
                      <CheckCircle2 size={14} />
                      Logged to Diary
                    </span>
                  ) : (
                    <Button
                      onClick={() => handleOpenConfirm(item)}
                      size="sm"
                      variant="outline"
                      icon={<PlusCircle size={14} />}
                      className="text-xs hover:border-[#375A41] hover:text-[#375A41]"
                    >
                      Log to Diary
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Medical & Nutritional Disclaimer Banner */}
      <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E5DD] flex items-start gap-2 text-[11px] text-[#717A73]">
        <Info size={14} className="shrink-0 mt-0.5 text-[#88935D]" />
        <span>
          <strong>Nutritional Advisory:</strong> Suggestions are educational estimates formulated from available daily targets and food catalogue data. They do not constitute medical dietary prescriptions.
        </span>
      </div>

      {/* Explicit Confirmation Dialog (Mandatory User Review before saving) */}
      {confirmItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#E8E5DD] space-y-4 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
              <div className="flex items-center gap-2">
                <Utensils size={18} className="text-[#375A41]" />
                <h3 id="confirm-modal-title" className="text-sm font-bold text-[#1C1F1D]">
                  Confirm Food Diary Entry
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseConfirm}
                disabled={isLogging}
                className="p-1 rounded-lg text-[#717A73] hover:text-[#1C1F1D] hover:bg-[#FAF8F5]"
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>

            {logError && (
              <div className="p-3 rounded-lg bg-[#FDF3F0] border border-[#F3C4B8] text-xs text-[#A63A20] flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{logError}</span>
              </div>
            )}

            {/* Food Summary */}
            <div className="space-y-3">
              <div>
                <span className="text-xs text-[#717A73]">Food Item</span>
                <p className="text-base font-bold text-[#1C1F1D]">
                  {confirmItem.food_name}
                </p>
                {confirmItem.local_name && (
                  <p className="text-xs text-[#717A73] italic">
                    {confirmItem.local_name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E5DD] text-xs">
                <div>
                  <span className="text-[#717A73] block text-[11px]">Serving Size</span>
                  <span className="font-semibold text-[#1C1F1D]">
                    {confirmItem.serving_size} ({confirmItem.portion_grams}g)
                  </span>
                </div>
                <div>
                  <span className="text-[#717A73] block text-[11px]">Calories</span>
                  <span className="font-semibold text-[#1C1F1D]">
                    {confirmItem.calories} kcal
                  </span>
                </div>
                <div>
                  <span className="text-[#717A73] block text-[11px]">Protein</span>
                  <span className="font-semibold text-[#437151]">
                    {confirmItem.protein_g}g
                  </span>
                </div>
                <div>
                  <span className="text-[#717A73] block text-[11px]">Carbs / Fat</span>
                  <span className="font-semibold text-[#1C1F1D]">
                    {confirmItem.carbs_g}g / {confirmItem.fat_g}g
                  </span>
                </div>
              </div>

              {/* Meal Type Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1F1D]">
                  Select Meal Category in Food Diary:
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["Breakfast", "Lunch", "Dinner", "Snacks"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setConfirmMealType(m)}
                      className={`py-1.5 text-xs rounded-lg font-medium transition-all ${
                        confirmMealType.toLowerCase() === m.toLowerCase()
                          ? "bg-[#375A41] text-white"
                          : "bg-[#FAF8F5] text-[#575E59] border border-[#E8E5DD]"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Verification Status */}
              <div className="text-[11px] text-[#717A73] flex items-center gap-1.5">
                {confirmItem.is_verified ? (
                  <>
                    <ShieldCheck size={14} className="text-[#375A41]" />
                    <span>Values will be saved using verified catalogue calculations.</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="text-[#B58514]" />
                    <span>Values will be saved as an AI estimated entry.</span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#E8E5DD] flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCloseConfirm}
                disabled={isLogging}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleExecuteLog}
                disabled={isLogging}
                icon={isLogging ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              >
                {isLogging ? "Logging..." : "Confirm & Save to Diary"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

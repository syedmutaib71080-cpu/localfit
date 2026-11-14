"use client";

import * as React from "react";
import {
  Mic,
  MicOff,
  Sparkles,
  Trash2,
  Plus,
  RotateCcw,
  Check,
  AlertCircle,
  Loader2,
  X,
  ArrowLeft,
  ShieldCheck,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceRecognition } from "@/lib/use-voice-recognition";
import { createFoodLog } from "@/lib/nutrition-client";
import type { VoiceParsedFoodCandidate, VoiceLogParseResponse } from "@/types/voice-log";
import type { MealType as NutritionMealType } from "@/types/nutrition-tracking";

export interface VoiceLogModalProps {
  isOpen: boolean;
  defaultDate: string;
  defaultMealType?: NutritionMealType;
  onClose: () => void;
  onSuccess: (message?: string) => Promise<void> | void;
}

const REGIONAL_EXAMPLES = [
  { label: "Roti & Dal", text: "2 rotis with 1 katori dal and 100g curd" },
  { label: "Bhatkal Biryani", text: "Bhatkal chicken biryani with raita" },
  { label: "Neer Dosa", text: "3 neer dosas with coconut chutney and filter coffee" },
  { label: "Eggs & Toast", text: "2 boiled eggs with 2 slices of whole wheat toast" },
];

const MEAL_CATEGORY_OPTIONS: { id: NutritionMealType; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snacks" },
];

export function VoiceLogModal({
  isOpen,
  defaultDate,
  defaultMealType = "lunch",
  onClose,
  onSuccess,
}: VoiceLogModalProps) {
  if (!isOpen) return null;

  return (
    <VoiceLogModalDialog
      defaultDate={defaultDate}
      defaultMealType={defaultMealType}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function VoiceLogModalDialog({
  defaultDate,
  defaultMealType,
  onClose,
  onSuccess,
}: {
  defaultDate: string;
  defaultMealType: NutritionMealType;
  onClose: () => void;
  onSuccess: (message?: string) => Promise<void> | void;
}) {
  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    permissionDenied,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
  } = useVoiceRecognition();

  // Local state
  const [step, setStep] = React.useState<"record" | "review">("record");
  const [mealCategory, setMealCategory] = React.useState<NutritionMealType>(defaultMealType);
  const [consumptionDate, setConsumptionDate] = React.useState<string>(defaultDate);
  const [isParsing, setIsParsing] = React.useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [candidates, setCandidates] = React.useState<VoiceParsedFoodCandidate[]>([]);

  // Handle ESC key to dismiss modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isParsing && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isParsing, isSubmitting, onClose]);

  // Handle microphone toggle
  const handleToggleMic = () => {
    setActionError(null);
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Handle clear text
  const handleClear = () => {
    stopListening();
    resetTranscript();
    setActionError(null);
  };

  // Step 1: Parse Spoken Transcript with AI
  const handleParseTranscript = async () => {
    const trimmed = transcript.trim();
    if (!trimmed) {
      setActionError("Please speak or enter a description of what you ate.");
      return;
    }

    if (isListening) {
      stopListening();
    }

    setIsParsing(true);
    setActionError(null);

    try {
      const res = await fetch("/api/ai/voice-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: trimmed,
          meal_type: mealCategory,
          date: consumptionDate,
        }),
      });

      const data: VoiceLogParseResponse = await res.json().catch(() => ({
        success: false,
        error: "INVALID_RESPONSE",
        message: "Failed to parse server response.",
      }));

      if (!res.ok || !data.success) {
        const errorMsg =
          data.message || data.error || `Voice parsing failed with status ${res.status}.`;
        setActionError(errorMsg);
        return;
      }

      if (!data.items || data.items.length === 0) {
        setActionError(
          "No food items could be identified from your description. Please try describing specific dishes and portions (e.g. '2 rotis and 1 bowl dal')."
        );
        return;
      }

      // Populate candidate items
      setCandidates(
        data.items.map((item) => ({
          ...item,
          selected_for_saving: true,
        }))
      );

      // Auto-update meal category if detected
      if (data.meal_type) {
        const lower = data.meal_type.toLowerCase();
        if (
          lower === "breakfast" ||
          lower === "lunch" ||
          lower === "dinner" ||
          lower === "snack" ||
          lower === "snacks"
        ) {
          setMealCategory(lower === "snacks" ? "snack" : (lower as NutritionMealType));
        }
      }

      setStep("review");
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Network error communicating with the voice logging service."
      );
    } finally {
      setIsParsing(false);
    }
  };

  // Step 2 Candidate Edits: Update portion grams
  const handleUpdatePortion = (id: string, newGrams: number) => {
    const clampedGrams = Math.max(5, Math.min(2500, Math.round(newGrams)));
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;

        // Calculate per-100g baseline
        const per100Calories = c.nutrition_per_100g?.calories ?? (c.calories / (c.portion_grams || 100)) * 100;
        const per100Protein = c.nutrition_per_100g?.protein ?? (c.protein_g / (c.portion_grams || 100)) * 100;
        const per100Carbs = c.nutrition_per_100g?.carbohydrates ?? (c.carbs_g / (c.portion_grams || 100)) * 100;
        const per100Fat = c.nutrition_per_100g?.fat ?? (c.fat_g / (c.portion_grams || 100)) * 100;
        const per100Fibre = c.nutrition_per_100g?.fibre ?? (c.fibre_g !== null ? (c.fibre_g / (c.portion_grams || 100)) * 100 : null);

        const newCalories = Math.max(0, Math.round((per100Calories * clampedGrams) / 100));
        const newProtein = Math.max(0, Math.round(((per100Protein * clampedGrams) / 100) * 10) / 10);
        const newCarbs = Math.max(0, Math.round(((per100Carbs * clampedGrams) / 100) * 10) / 10);
        const newFat = Math.max(0, Math.round(((per100Fat * clampedGrams) / 100) * 10) / 10);
        const newFibre = per100Fibre !== null ? Math.max(0, Math.round(((per100Fibre * clampedGrams) / 100) * 10) / 10) : null;

        return {
          ...c,
          portion_grams: clampedGrams,
          calories: newCalories,
          protein_g: newProtein,
          carbs_g: newCarbs,
          fat_g: newFat,
          fibre_g: newFibre,
        };
      })
    );
  };

  // Step 2: Toggle candidate selection
  const handleToggleSelectCandidate = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected_for_saving: !c.selected_for_saving } : c))
    );
  };

  // Step 2: Update candidate name
  const handleUpdateName = (id: string, newName: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, food_name: newName } : c))
    );
  };

  // Step 2: Remove a candidate
  const handleRemoveCandidate = (id: string) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  };

  // Step 2: Add a new custom candidate
  const handleAddCandidate = () => {
    const newId = `candidate-${Date.now()}`;
    const newCandidate: VoiceParsedFoodCandidate = {
      id: newId,
      food_name: "Custom Food Item",
      portion_grams: 100,
      serving_description: "100g serving",
      is_catalogue_match: false,
      matched_food_id: null,
      matched_food_name: null,
      calories: 120,
      protein_g: 5,
      carbs_g: 15,
      fat_g: 4,
      fibre_g: 2,
      confidence: "medium",
      confidence_score: 0.75,
      notes: "Added during voice review",
      selected_for_saving: true,
      nutrition_per_100g: {
        calories: 120,
        protein: 5,
        carbohydrates: 15,
        fat: 4,
        fibre: 2,
      },
    };
    setCandidates((prev) => [...prev, newCandidate]);
  };

  // Step 2: Final Submission to Diary (createFoodLog)
  const handleSaveToDiary = async () => {
    const selectedItems = candidates.filter((c) => c.selected_for_saving);
    if (selectedItems.length === 0) {
      setActionError("Please select at least one food item to log.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const savedNames: string[] = [];
      const errors: string[] = [];

      for (const item of selectedItems) {
        const per100Cal = item.nutrition_per_100g?.calories ?? Math.round((item.calories / (item.portion_grams || 100)) * 100);
        const per100Prot = item.nutrition_per_100g?.protein ?? Math.round(((item.protein_g / (item.portion_grams || 100)) * 100) * 10) / 10;
        const per100Carb = item.nutrition_per_100g?.carbohydrates ?? Math.round(((item.carbs_g / (item.portion_grams || 100)) * 100) * 10) / 10;
        const per100Fat = item.nutrition_per_100g?.fat ?? Math.round(((item.fat_g / (item.portion_grams || 100)) * 100) * 10) / 10;
        const per100Fib = item.nutrition_per_100g?.fibre ?? (item.fibre_g !== null ? Math.round(((item.fibre_g / (item.portion_grams || 100)) * 100) * 10) / 10 : null);

        const res = await createFoodLog({
          food_id: item.matched_food_id || null,
          food_name: item.food_name.trim() || "Food Item",
          meal_type: mealCategory,
          quantity_g: item.portion_grams,
          serving_name: item.serving_description || `${item.portion_grams}g portion`,
          calories_per_100g: per100Cal,
          protein_per_100g: per100Prot,
          carbohydrates_per_100g: per100Carb,
          fat_per_100g: per100Fat,
          fibre_per_100g: per100Fib,
          consumption_date: consumptionDate,
          notes: "Logged via voice",
        });

        if (res.success) {
          savedNames.push(item.food_name);
        } else {
          errors.push(`${item.food_name}: ${res.error || "Failed to log"}`);
        }
      }

      if (errors.length > 0 && savedNames.length === 0) {
        setActionError(`Failed to save items: ${errors.join("; ")}`);
        return;
      }

      const mealLabel = mealCategory.charAt(0).toUpperCase() + mealCategory.slice(1);
      const summaryMsg =
        savedNames.length === 1
          ? `Added "${savedNames[0]}" to ${mealLabel}`
          : `Added ${savedNames.length} items to ${mealLabel}`;

      await onSuccess(summaryMsg);
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error saving food items to diary.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Review Totals Summary
  const selectedCandidates = candidates.filter((c) => c.selected_for_saving);
  const totalCalories = selectedCandidates.reduce((acc, c) => acc + c.calories, 0);
  const totalProtein = Math.round(selectedCandidates.reduce((acc, c) => acc + c.protein_g, 0) * 10) / 10;
  const totalCarbs = Math.round(selectedCandidates.reduce((acc, c) => acc + c.carbs_g, 0) * 10) / 10;
  const totalFat = Math.round(selectedCandidates.reduce((acc, c) => acc + c.fat_g, 0) * 10) / 10;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-xl rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-2xl space-y-5 my-8 animate-in fade-in-50 zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#E8E5DD]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#E2ECE4] border border-[#C7DBD0] text-[#375A41]">
              <Mic size={20} />
            </div>
            <div>
              <h3 id="voice-modal-title" className="text-lg font-bold text-[#1C1F1D] flex items-center gap-2">
                Voice Food Logging
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E2ECE4] text-[#263B2C] border border-[#C7DBD0]">
                  AI Powered
                </span>
              </h3>
              <p className="text-xs text-[#575E59]">
                {step === "record"
                  ? "Describe your meal naturally in English or regional dish names"
                  : "Review, edit portion sizes, and confirm items before logging"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isParsing || isSubmitting}
            className="p-1 rounded-lg text-[#717A73] hover:text-[#1C1F1D] hover:bg-[#FAF8F5] disabled:opacity-50"
            aria-label="Close voice food logging dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Global Action / Error Banner */}
        {actionError && (
          <div className="rounded-xl border border-[#FCA5A5] bg-[#FEE2E2] p-3 text-xs font-semibold text-[#B91C1C] flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-xs underline hover:text-[#7F1D1D]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Speech Error Banner (if browser permission denied or unsupported) */}
        {(speechError || permissionDenied || (!isSupported && typeof window !== "undefined")) && step === "record" && (
          <div className="rounded-xl border border-[#E8D49E] bg-[#FDF6E2] p-3 text-xs text-[#7A5813] flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Speech Recognition Notice:</span>
              <span>
                {permissionDenied
                  ? "Microphone access is blocked. You can still type your meal description below."
                  : speechError ||
                    "Voice recognition is unavailable in this browser. You can type your meal description directly."}
              </span>
            </div>
          </div>
        )}

        {/* STEP 1: RECORD & INPUT */}
        {step === "record" && (
          <div className="space-y-4">
            {/* Microphone Interaction Hero */}
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-[#E8E5DD] bg-[#FAF8F5] text-center space-y-3">
              <div className="relative">
                {isListening && (
                  <span className="absolute -inset-2 rounded-full bg-[#E2ECE4] animate-ping opacity-75" />
                )}
                <button
                  type="button"
                  onClick={handleToggleMic}
                  disabled={isParsing}
                  aria-label={isListening ? "Stop voice listening" : "Start voice listening"}
                  className={`relative p-5 rounded-full transition-all shadow-md focus:outline-none focus:ring-4 ${
                    isListening
                      ? "bg-[#DC2626] text-white hover:bg-[#B91C1C] focus:ring-red-200"
                      : "bg-[#437151] text-white hover:bg-[#375A41] focus:ring-[#C7DBD0]"
                  }`}
                >
                  {isListening ? (
                    <MicOff size={28} className="animate-pulse" />
                  ) : (
                    <Mic size={28} />
                  )}
                </button>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#1C1F1D]">
                  {isListening ? "Listening... Tap to stop" : "Tap microphone to speak"}
                </p>
                <p className="text-xs text-[#575E59]">
                  Speak clearly e.g. &ldquo;2 rotis with 1 bowl dal and half cup curd&rdquo;
                </p>
              </div>

              {/* Privacy Disclosure Notice */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-[#E8E5DD] text-[11px] text-[#575E59] text-left max-w-md">
                <ShieldCheck size={16} className="text-[#375A41] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-[#1C1F1D] block">Voice Privacy &amp; AI Processing Disclosure</span>
                  <p>
                    <strong>Speech Recognition:</strong> Microphone audio is processed through your browser&apos;s built-in speech engine, which may transmit audio to services operated by your browser vendor (e.g. Google or Apple). LocalFit does not store raw microphone audio.
                  </p>
                  <p>
                    <strong>Gemini AI Parsing:</strong> When you click &ldquo;Analyze Meal with AI&rdquo;, the resulting text transcript is sent to Google&apos;s Gemini AI service for food identification and nutritional estimation.
                  </p>
                  <p className="text-[#717A73]">
                    Manual text entry is always available below without microphone permission.
                  </p>
                </div>
              </div>

              {interimTranscript && (
                <div className="w-full text-xs text-[#437151] italic bg-white/80 border border-[#C7DBD0] rounded-xl px-3 py-1.5 animate-pulse">
                  &ldquo;{interimTranscript}&rdquo;
                </div>
              )}
            </div>

            {/* Transcript / Manual Input Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#1C1F1D]">
                  Spoken Transcript or Description
                </label>
                {transcript && (
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={isParsing}
                    className="text-[11px] font-medium text-[#717A73] hover:text-[#B91C1C] flex items-center gap-1"
                  >
                    <RotateCcw size={11} />
                    <span>Clear text</span>
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                placeholder="Spoken words will appear here, or you can type directly (e.g. 2 idlis with sambar and coconut chutney)..."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                disabled={isParsing}
                className="w-full rounded-xl border border-[#E8E5DD] bg-white px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151] resize-none"
              />
            </div>

            {/* Regional Example Quick Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-[#575E59] block uppercase tracking-wider">
                Or try a quick regional meal:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {REGIONAL_EXAMPLES.map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    onClick={() => {
                      setTranscript(ex.text);
                      setActionError(null);
                    }}
                    disabled={isParsing || isListening}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-[#E8E5DD] bg-white text-[#263B2C] hover:bg-[#FAF8F5] hover:border-[#437151] transition-colors"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Meal Category & Date Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1F1D] block">Meal Category</label>
                <div className="grid grid-cols-4 gap-1">
                  {MEAL_CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMealCategory(opt.id)}
                      disabled={isParsing}
                      className={`py-1.5 px-1 text-center rounded-lg text-xs font-semibold transition-all ${
                        mealCategory === opt.id
                          ? "bg-[#437151] text-white shadow-sm"
                          : "bg-[#FAF8F5] text-[#575E59] hover:bg-[#E8E5DD] border border-[#E8E5DD]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1F1D] block">Consumption Date</label>
                <input
                  type="date"
                  value={consumptionDate}
                  onChange={(e) => setConsumptionDate(e.target.value)}
                  disabled={isParsing}
                  className="w-full rounded-lg border border-[#E8E5DD] bg-white px-2.5 py-1.5 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151]"
                />
              </div>
            </div>

            {/* Parse Action Button */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E8E5DD]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isParsing}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleParseTranscript}
                disabled={isParsing || !transcript.trim()}
                icon={isParsing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                iconPosition="left"
                className="text-xs"
              >
                {isParsing ? "Analyzing Meal..." : "Analyze Meal with AI"}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW & CONFIRM CANDIDATES */}
        {step === "review" && (
          <div className="space-y-4">
            {/* Top Transcript Banner with Back Button */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E5DD]">
              <div className="flex-1 mr-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#575E59] block">
                  Original Description
                </span>
                <p className="text-xs text-[#1C1F1D] italic line-clamp-2">
                  &ldquo;{transcript}&rdquo;
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep("record")}
                disabled={isSubmitting}
                icon={<ArrowLeft size={12} />}
                iconPosition="left"
                className="text-xs shrink-0"
              >
                Edit Voice
              </Button>
            </div>

            {/* Nutrition Totals Summary Bar */}
            <div className="p-3 rounded-xl border border-[#C7DBD0] bg-[#E2ECE4] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-[#263B2C]">
                <Utensils size={14} className="text-[#375A41]" />
                <span>
                  {selectedCandidates.length} of {candidates.length} items selected
                </span>
              </div>
              <div className="flex items-center gap-3 font-semibold text-[#1C1F1D]">
                <span>
                  <strong className="text-[#375A41]">{totalCalories}</strong> kcal
                </span>
                <span>
                  <strong className="text-[#0284C7]">{totalProtein}g</strong> P
                </span>
                <span>
                  <strong className="text-[#D97706]">{totalCarbs}g</strong> C
                </span>
                <span>
                  <strong className="text-[#E11D48]">{totalFat}g</strong> F
                </span>
              </div>
            </div>

            {/* Candidates List */}
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {candidates.map((cand) => (
                <div
                  key={cand.id}
                  className={`p-3 rounded-xl border transition-all space-y-2.5 ${
                    cand.selected_for_saving
                      ? "border-[#C7DBD0] bg-white shadow-xs"
                      : "border-[#E8E5DD] bg-[#FAF8F5] opacity-60"
                  }`}
                >
                  {/* Row 1: Checkbox + Editable Name + Badges + Remove */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="checkbox"
                        checked={cand.selected_for_saving}
                        onChange={() => handleToggleSelectCandidate(cand.id)}
                        disabled={isSubmitting}
                        aria-label={`Select ${cand.food_name} for saving`}
                        className="rounded border-[#C7DBD0] text-[#437151] focus:ring-[#437151] h-4 w-4 shrink-0"
                      />
                      <input
                        type="text"
                        value={cand.food_name}
                        onChange={(e) => handleUpdateName(cand.id, e.target.value)}
                        disabled={isSubmitting}
                        className="font-bold text-xs text-[#1C1F1D] bg-transparent border-b border-transparent hover:border-[#E8E5DD] focus:border-[#437151] focus:outline-none w-full"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {cand.is_catalogue_match ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E2ECE4] text-[#263B2C] border border-[#C7DBD0]">
                          <ShieldCheck size={11} className="text-[#375A41]" />
                          Verified Match
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[#717A73] border border-[#E8E5DD]">
                          Estimated
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveCandidate(cand.id)}
                        disabled={isSubmitting}
                        aria-label={`Remove ${cand.food_name}`}
                        className="p-1 text-[#717A73] hover:text-[#B91C1C] rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Portion Controls & Serving Label */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-[#FAF8F5] p-2 rounded-lg border border-[#E8E5DD]">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-[#575E59]">Portion:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdatePortion(cand.id, cand.portion_grams - 25)}
                          disabled={isSubmitting || cand.portion_grams <= 25}
                          className="px-1.5 py-0.5 rounded bg-white border border-[#E8E5DD] text-[11px] font-bold text-[#575E59] hover:bg-[#FAF8F5] disabled:opacity-40"
                        >
                          -25g
                        </button>
                        <div className="flex items-center">
                          <input
                            type="number"
                            min={5}
                            max={2500}
                            value={cand.portion_grams}
                            onChange={(e) => handleUpdatePortion(cand.id, Number(e.target.value))}
                            disabled={isSubmitting}
                            className="w-14 rounded bg-white border border-[#E8E5DD] px-1.5 py-0.5 text-center text-xs font-semibold text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151]"
                          />
                          <span className="text-[11px] text-[#575E59] ml-1">g</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdatePortion(cand.id, cand.portion_grams + 25)}
                          disabled={isSubmitting || cand.portion_grams >= 2500}
                          className="px-1.5 py-0.5 rounded bg-white border border-[#E8E5DD] text-[11px] font-bold text-[#575E59] hover:bg-[#FAF8F5] disabled:opacity-40"
                        >
                          +25g
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-[#717A73] italic">
                      {cand.serving_description}
                    </div>
                  </div>

                  {/* Row 3: Live Calculated Macros */}
                  <div className="flex items-center gap-2 text-[11px] font-medium text-[#575E59]">
                    <span className="px-2 py-0.5 rounded bg-white border border-[#E8E5DD] font-bold text-[#375A41]">
                      {cand.calories} kcal
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white border border-[#E8E5DD]">
                      {cand.protein_g}g Protein
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white border border-[#E8E5DD]">
                      {cand.carbs_g}g Carbs
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white border border-[#E8E5DD]">
                      {cand.fat_g}g Fat
                    </span>
                    {cand.fibre_g !== null && (
                      <span className="px-2 py-0.5 rounded bg-white border border-[#E8E5DD]">
                        {cand.fibre_g}g Fibre
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add another candidate button */}
            <div className="flex justify-start">
              <button
                type="button"
                onClick={handleAddCandidate}
                disabled={isSubmitting}
                className="text-xs font-semibold text-[#437151] hover:text-[#375A41] flex items-center gap-1.5 p-1 rounded hover:bg-[#FAF8F5]"
              >
                <Plus size={14} />
                <span>Add Another Item</span>
              </button>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-[#E8E5DD]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep("record")}
                disabled={isSubmitting}
                className="text-xs"
              >
                Back to Voice
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveToDiary}
                disabled={isSubmitting || selectedCandidates.length === 0}
                icon={isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                iconPosition="left"
                className="text-xs"
              >
                {isSubmitting
                  ? "Saving to Diary..."
                  : `Log ${selectedCandidates.length} Items to Diary`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

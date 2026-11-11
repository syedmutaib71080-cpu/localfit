"use client";

import * as React from "react";
import Link from "next/link";
import {
  Camera,
  UploadCloud,
  Sparkles,
  Check,
  ChevronLeft,
  Plus,
  Minus,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  Edit3,
  Trash2,
  Info,
  ArrowRight,
  PlusCircle,
  Lock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/ui/page-container";
import { compressImageForUpload, validateImageFile } from "@/lib/image-compression";
import { createFoodLog, getTodayDateString } from "@/lib/nutrition-client";
import { createClient } from "@/lib/supabase/client";
import { normalizeMealType } from "@/types/nutrition-tracking";
import type { MealType as TrackingMealType } from "@/types/nutrition-tracking";
import type { MealType } from "@/types/food-log";
import type {
  FoodScanEstimate,
  FoodScanApiResponse,
  ScannerScreenState,
  IdentifiedFoodItem,
  ConfidenceLevel,
} from "@/types/food-scan";

// Sample test meals with multi-item plates for instant interactive testing
const SAMPLE_TEST_MEALS: Array<{
  label: string;
  estimate: FoodScanEstimate;
}> = [
  {
    label: "Bhatkal Biryani Platter",
    estimate: {
      is_food_detected: true,
      meal_summary: "Bhatkal Chicken Biryani with Onion Raita",
      items: [
        {
          id: "sample_item_1",
          food_name: "Bhatkal Chicken Biryani",
          alternative_names: ["Bhatkally Biryani", "Coastal Dum Biryani"],
          category: "Grains & Breads",
          portion_grams: 250,
          calories: 430,
          protein_g: 24.5,
          carbs_g: 55.0,
          fat_g: 13.0,
          fibre_g: 3.5,
          confidence: "high",
          confidence_score: 94,
          notes:
            "Visually matched with verified Bhatkal recipe. Ghee and cooking oil quantities are estimated based on standard preparation.",
          is_catalogue_match: true,
          matched_database_food_id: "11111111-1111-4111-a111-111111111115",
          matched_database_food_name: "Bhatkal Chicken Biryani",
          nutrition_per_100g: {
            calories: 172,
            protein: 9.8,
            carbohydrates: 22.0,
            fat: 5.2,
            fibre: 1.4,
          },
          selected_for_saving: true,
        },
        {
          id: "sample_item_2",
          food_name: "Curd (Plain Dahi)",
          alternative_names: ["Dahi", "Yogurt", "Raita"],
          category: "Dairy",
          portion_grams: 80,
          calories: 48,
          protein_g: 2.8,
          carbs_g: 3.8,
          fat_g: 2.4,
          fibre_g: 0.0,
          confidence: "high",
          confidence_score: 90,
          notes: "Small side bowl of plain curd / raita.",
          is_catalogue_match: true,
          matched_database_food_id: "11111111-1111-4111-a111-111111111108",
          matched_database_food_name: "Curd (Plain Dahi)",
          nutrition_per_100g: {
            calories: 60,
            protein: 3.5,
            carbohydrates: 4.7,
            fat: 3.0,
            fibre: 0.0,
          },
          selected_for_saving: true,
        },
      ],
      food_name: "Bhatkal Chicken Biryani",
      alternative_names: ["Bhatkally Biryani"],
      ingredients: [
        { name: "Basmati Rice (Steamed)", estimated_weight_g: 130, confidence: 96 },
        { name: "Marinated Chicken", estimated_weight_g: 80, confidence: 92 },
      ],
      cooking_method: "Layered Dum Steaming",
      estimated_weight_g: 330,
      estimated_calories: 478,
      estimated_protein: 27.3,
      estimated_carbohydrates: 58.8,
      estimated_fat: 15.4,
      estimated_fibre: 3.5,
      confidence: 94,
      uncertainty_notes: "Ghee and cooking oil quantities are estimated based on standard preparation.",
      estimation_source: "database_match",
      nutrition_per_100g: {
        calories: 172,
        protein: 9.8,
        carbohydrates: 22.0,
        fat: 5.2,
        fibre: 1.4,
      },
    },
  },
  {
    label: "Neer Dosa & Chutney",
    estimate: {
      is_food_detected: true,
      meal_summary: "Neer Dosa with Fresh Coconut Chutney",
      items: [
        {
          id: "sample_item_3",
          food_name: "Neer Dosa",
          alternative_names: ["Neer Dose", "Bari Dosa", "Tulu Nadu Rice Crepe"],
          category: "Grains & Breads",
          portion_grams: 120,
          calories: 198,
          protein_g: 3.8,
          carbs_g: 40.8,
          fat_g: 2.2,
          fibre_g: 1.4,
          confidence: "high",
          confidence_score: 96,
          notes: "Lace-thin steamed rice crepes (2 pieces).",
          is_catalogue_match: true,
          matched_database_food_id: "11111111-1111-4111-a111-111111111113",
          matched_database_food_name: "Neer Dosa",
          nutrition_per_100g: {
            calories: 165,
            protein: 3.2,
            carbohydrates: 34.0,
            fat: 1.8,
            fibre: 1.2,
          },
          selected_for_saving: true,
        },
      ],
      food_name: "Neer Dosa",
      alternative_names: ["Neer Dose"],
      ingredients: [{ name: "Rice Batter (Steamed)", estimated_weight_g: 110, confidence: 98 }],
      cooking_method: "Steamed on griddle",
      estimated_weight_g: 120,
      estimated_calories: 198,
      estimated_protein: 3.8,
      estimated_carbohydrates: 40.8,
      estimated_fat: 2.2,
      estimated_fibre: 1.4,
      confidence: 96,
      uncertainty_notes: "Visual portion is an approximation.",
      estimation_source: "database_match",
      nutrition_per_100g: {
        calories: 165,
        protein: 3.2,
        carbohydrates: 34.0,
        fat: 1.8,
        fibre: 1.2,
      },
    },
  },
  {
    label: "Fish Curry & Rice Meal",
    estimate: {
      is_food_detected: true,
      meal_summary: "Steamed White Rice with Coastal Pomfret Curry",
      items: [
        {
          id: "sample_item_4",
          food_name: "White Rice (Cooked)",
          alternative_names: ["Chawal", "Bhat", "Steamed Rice"],
          category: "Grains & Breads",
          portion_grams: 150,
          calories: 195,
          protein_g: 4.1,
          carbs_g: 42.3,
          fat_g: 0.5,
          fibre_g: 0.6,
          confidence: "high",
          confidence_score: 95,
          notes: "Standard portion of cooked plain white rice.",
          is_catalogue_match: true,
          matched_database_food_id: "11111111-1111-4111-a111-111111111101",
          matched_database_food_name: "White Rice (Cooked)",
          nutrition_per_100g: {
            calories: 130,
            protein: 2.7,
            carbohydrates: 28.2,
            fat: 0.3,
            fibre: 0.4,
          },
          selected_for_saving: true,
        },
        {
          id: "sample_item_5",
          food_name: "Pomfret Fish (Steamed)",
          alternative_names: ["Manji Fish", "Paplet", "White Pomfret"],
          category: "Seafood",
          portion_grams: 120,
          calories: 122,
          protein_g: 23.2,
          carbs_g: 0.0,
          fat_g: 3.4,
          fibre_g: 0.0,
          confidence: "high",
          confidence_score: 92,
          notes: "Steamed fish fillet. Salt and curry oil estimated.",
          is_catalogue_match: true,
          matched_database_food_id: "11111111-1111-4111-a111-111111111111",
          matched_database_food_name: "Pomfret Fish (Steamed)",
          nutrition_per_100g: {
            calories: 102,
            protein: 19.3,
            carbohydrates: 0.0,
            fat: 2.8,
            fibre: 0.0,
          },
          selected_for_saving: true,
        },
      ],
      food_name: "Steamed Pomfret with Rice",
      alternative_names: ["Fish Thali"],
      ingredients: [
        { name: "White Rice", estimated_weight_g: 150, confidence: 95 },
        { name: "Pomfret Fillet", estimated_weight_g: 120, confidence: 92 },
      ],
      cooking_method: "Steamed & Boiled",
      estimated_weight_g: 270,
      estimated_calories: 317,
      estimated_protein: 27.3,
      estimated_carbohydrates: 42.3,
      estimated_fat: 3.9,
      estimated_fibre: 0.6,
      confidence: 93,
      uncertainty_notes: "Salt and seasoning cannot be measured visually.",
      estimation_source: "database_match",
      nutrition_per_100g: {
        calories: 117,
        protein: 10.1,
        carbohydrates: 15.7,
        fat: 1.4,
        fibre: 0.2,
      },
    },
  },
];

function getDefaultMealType(): MealType {
  if (typeof window === "undefined") return "Lunch";
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "Breakfast";
  if (hour >= 11 && hour < 16) return "Lunch";
  if (hour >= 16 && hour < 22) return "Dinner";
  return "Snacks";
}

export default function FoodScanPage() {
  const [screenState, setScreenState] = React.useState<ScannerScreenState>("waiting_for_image");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [scanStepMessage, setScanStepMessage] = React.useState<string>("");

  // Authenticated user state
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  // Identified items on the meal plate
  const [identifiedItems, setIdentifiedItems] = React.useState<IdentifiedFoodItem[]>([]);
  const [mealSummary, setMealSummary] = React.useState<string>("");

  // Review & Confirmation State
  const [selectedMealType, setSelectedMealType] = React.useState<MealType>(getDefaultMealType);
  const [mealNotes, setMealNotes] = React.useState<string>("");
  const [isLogging, setIsLogging] = React.useState(false);
  const [loggedNotification, setLoggedNotification] = React.useState<string | null>(null);

  // Manual item addition state
  const [isAddingManualItem, setIsAddingManualItem] = React.useState(false);
  const [newFoodName, setNewFoodName] = React.useState("");
  const [newPortionG, setNewPortionG] = React.useState(100);
  const [newCalories, setNewCalories] = React.useState(150);
  const [newProtein, setNewProtein] = React.useState(5);
  const [newCarbs, setNewCarbs] = React.useState(20);
  const [newFat, setNewFat] = React.useState(3);

  // Hidden native file input refs
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);
  const galleryInputRef = React.useRef<HTMLInputElement | null>(null);

  // Check Supabase session on mount
  React.useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setIsAuthenticated(Boolean(session));
      } catch {
        setIsAuthenticated(false);
      }
    }
    checkAuth();
  }, []);

  // Revoke object URL on unmount to prevent browser memory leaks
  React.useEffect(() => {
    return () => {
      if (imagePreviewUrl && imagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // Recalculate nutrient values for a specific item when portion changes
  const handleItemPortionChange = (itemId: string, newWeight: number) => {
    const clampedWeight = Math.max(10, Math.min(2500, Math.round(newWeight)));
    setIdentifiedItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        const per100 = item.nutrition_per_100g;
        const multiplier = clampedWeight / 100;

        const newCal =
          per100.calories !== null ? Math.round(per100.calories * multiplier) : null;
        const newProt =
          per100.protein !== null ? Math.round(per100.protein * multiplier * 10) / 10 : null;
        const newCarbs =
          per100.carbohydrates !== null
            ? Math.round(per100.carbohydrates * multiplier * 10) / 10
            : null;
        const newFat =
          per100.fat !== null ? Math.round(per100.fat * multiplier * 10) / 10 : null;
        const newFibre =
          per100.fibre !== null ? Math.round(per100.fibre * multiplier * 10) / 10 : null;

        return {
          ...item,
          portion_grams: clampedWeight,
          calories: newCal,
          protein_g: newProt,
          carbs_g: newCarbs,
          fat_g: newFat,
          fibre_g: newFibre,
        };
      })
    );
  };

  // Update item food name
  const handleItemNameChange = (itemId: string, newName: string) => {
    setIdentifiedItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, food_name: newName } : item))
    );
  };

  // Toggle saving of an item
  const handleToggleItemSelection = (itemId: string) => {
    setIdentifiedItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, selected_for_saving: !item.selected_for_saving } : item
      )
    );
  };

  // Delete an identified item from the meal
  const handleDeleteItem = (itemId: string) => {
    setIdentifiedItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Add a manual item to the plate
  const handleAddManualItem = () => {
    if (!newFoodName.trim()) return;

    const per100Multiplier = newPortionG > 0 ? 100 / newPortionG : 1;
    const newItem: IdentifiedFoodItem = {
      id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      food_name: newFoodName.trim(),
      alternative_names: [],
      category: "Custom Addition",
      portion_grams: newPortionG,
      calories: newCalories,
      protein_g: newProtein,
      carbs_g: newCarbs,
      fat_g: newFat,
      fibre_g: null,
      confidence: "high",
      confidence_score: 90,
      notes: "Manually added food item.",
      is_catalogue_match: false,
      matched_database_food_id: null,
      matched_database_food_name: null,
      nutrition_per_100g: {
        calories: Math.round(newCalories * per100Multiplier),
        protein: Math.round(newProtein * per100Multiplier * 10) / 10,
        carbohydrates: Math.round(newCarbs * per100Multiplier * 10) / 10,
        fat: Math.round(newFat * per100Multiplier * 10) / 10,
        fibre: null,
      },
      selected_for_saving: true,
    };

    setIdentifiedItems((prev) => [...prev, newItem]);
    setNewFoodName("");
    setIsAddingManualItem(false);
  };

  // Image Selection Handler (Client-side validation)
  const handleFileSelected = async (file: File) => {
    setErrorMessage(null);
    setLoggedNotification(null);

    // Validate size (max 10MB) and supported formats (JPEG, PNG, WebP)
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setScreenState("unsupported_image");
      setErrorMessage(validation.error || "Unsupported image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setScreenState("payload_too_large");
      setErrorMessage("Image exceeds the maximum allowed file size of 10MB.");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreviewUrl(objectUrl);
    setScreenState("image_selected");
  };

  // Reset Scanner State
  const handleResetScanner = () => {
    if (imagePreviewUrl && imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setIdentifiedItems([]);
    setMealSummary("");
    setErrorMessage(null);
    setScreenState("waiting_for_image");
  };

  // Load a Pre-Analyzed Sample Meal (Instant demonstration & testing)
  const handleLoadSampleMeal = (sample: (typeof SAMPLE_TEST_MEALS)[0]) => {
    setErrorMessage(null);
    setLoggedNotification(null);
    setIdentifiedItems(sample.estimate.items);
    setMealSummary(sample.estimate.meal_summary || sample.label);
    setScreenState("results_ready");
  };

  // Primary Scan Execution (Sends image to /api/food/scan)
  const handleScanImage = async () => {
    if (!selectedFile) return;

    setScreenState("scanning");
    setErrorMessage(null);
    setScanStepMessage("Optimizing image for AI analysis...");

    try {
      // Client-side compression to speed up upload
      const compressed = await compressImageForUpload(selectedFile);

      setScanStepMessage("Analyzing meal with Gemini Vision...");

      const response = await fetch("/api/food/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: compressed.base64,
          mimeType: compressed.mimeType,
        }),
      });

      const result: FoodScanApiResponse = await response.json();

      if (!result.success) {
        if (response.status === 401 || result.code === "UNAUTHORIZED") {
          setScreenState("unauthorized");
          setErrorMessage("Please sign in to your LocalFit account to scan food photos.");
          return;
        }

        if (response.status === 503 || result.code === "API_KEY_MISSING") {
          setScreenState("api_key_not_configured");
          setErrorMessage(
            result.message || "Gemini API key is not configured on the server."
          );
          return;
        }

        if (response.status === 429 || result.code === "RATE_LIMIT_EXCEEDED" || result.code === "QUOTA_EXCEEDED") {
          setScreenState("quota_exceeded");
          setErrorMessage(result.message || "Scanning rate limit reached. Please wait a few moments.");
          return;
        }

        if (response.status === 413 || result.code === "PAYLOAD_TOO_LARGE") {
          setScreenState("payload_too_large");
          setErrorMessage(result.message || "Image file is too large. Max size is 10MB.");
          return;
        }

        if (result.code === "NO_FOOD_DETECTED") {
          setScreenState("no_food_detected");
          setErrorMessage(
            result.message ||
              "No food items could be detected in this photo. Please retake photo with better lighting or enter manually."
          );
          return;
        }

        setScreenState("scan_failed");
        setErrorMessage(result.message || "Could not analyze the photo. Please try again.");
        return;
      }

      // Success: populate identified items and meal summary
      setIdentifiedItems(result.data.items || []);
      setMealSummary(result.data.meal_summary || result.data.food_name);
      setScreenState("results_ready");
    } catch (err: unknown) {
      setScreenState("scan_failed");
      setErrorMessage(
        err instanceof Error ? err.message : "Network error connecting to food vision service."
      );
    }
  };

  // Compute Meal-level Totals for Selected Items
  const selectedItems = identifiedItems.filter((i) => i.selected_for_saving !== false);
  const mealTotalCalories = selectedItems.reduce((acc, i) => acc + (i.calories || 0), 0);
  const mealTotalProtein =
    Math.round(selectedItems.reduce((acc, i) => acc + (i.protein_g || 0), 0) * 10) / 10;
  const mealTotalCarbs =
    Math.round(selectedItems.reduce((acc, i) => acc + (i.carbs_g || 0), 0) * 10) / 10;
  const mealTotalFat =
    Math.round(selectedItems.reduce((acc, i) => acc + (i.fat_g || 0), 0) * 10) / 10;

  // Save Confirmed Food Logs to Diary (Explicit confirmation action)
  const handleConfirmAddToDiary = async () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one food item to save.");
      return;
    }

    setIsLogging(true);
    setLoggedNotification(null);

    const targetDate = getTodayDateString();
    const targetMealType: TrackingMealType =
      normalizeMealType(selectedMealType) || "lunch";

    let savedCount = 0;
    const errors: string[] = [];

    // Save each selected item via createFoodLog (POST /api/food/logs)
    for (const item of selectedItems) {
      try {
        const servingLabel = `${item.portion_grams}g (AI Estimate)`;
        const itemNotes = mealNotes
          ? `${mealNotes} • ${item.notes || "AI photo scan"}`
          : item.notes || "AI photo scan";

        const res = await createFoodLog({
          food_id: item.matched_database_food_id || null,
          food_name: item.food_name.trim(),
          meal_type: targetMealType,
          quantity_g: item.portion_grams,
          serving_name: servingLabel,
          consumption_date: targetDate,
          notes: itemNotes.slice(0, 2000),
          calories_per_100g: item.nutrition_per_100g.calories,
          protein_per_100g: item.nutrition_per_100g.protein,
          carbohydrates_per_100g: item.nutrition_per_100g.carbohydrates,
          fat_per_100g: item.nutrition_per_100g.fat,
          fibre_per_100g: item.nutrition_per_100g.fibre,
        });

        if (res.success) {
          savedCount++;
        } else {
          errors.push(`${item.food_name}: ${res.error || "Save failed"}`);
        }
      } catch (err) {
        errors.push(
          `${item.food_name}: ${err instanceof Error ? err.message : "Network error"}`
        );
      }
    }

    setIsLogging(false);

    if (savedCount > 0) {
      setLoggedNotification(
        `Successfully logged ${savedCount} food ${
          savedCount === 1 ? "item" : "items"
        } (${mealTotalCalories} kcal) to ${selectedMealType}!`
      );
      if (errors.length > 0) {
        alert(`Partial save: ${savedCount} saved, but encountered errors:\n${errors.join("\n")}`);
      }
    } else {
      alert(`Failed to save foods:\n${errors.join("\n")}`);
    }
  };

  // Helper for confidence badge variant
  const getConfidenceBadge = (confidence: ConfidenceLevel) => {
    switch (confidence) {
      case "high":
        return (
          <Badge variant="sage" size="sm" className="gap-1">
            <ShieldCheck size={11} className="text-[#375A41]" />
            <span>High Confidence</span>
          </Badge>
        );
      case "medium":
        return (
          <Badge variant="olive" size="sm" className="gap-1">
            <Sparkles size={11} className="text-[#6B7546]" />
            <span>Medium Confidence</span>
          </Badge>
        );
      case "low":
        return (
          <Badge variant="neutral" size="sm" className="gap-1">
            <AlertTriangle size={11} className="text-[#997324]" />
            <span>Uncertain</span>
          </Badge>
        );
    }
  };

  return (
    <PageContainer size="wide" className="space-y-8">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#E8E5DD]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/app/food"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#437151] hover:underline"
            >
              <ChevronLeft size={14} />
              <span>Back to Food Diary</span>
            </Link>
            <span className="text-[#D5D1C5]">•</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C7DBD0] bg-[#E2ECE4] px-2 py-0.5 text-[10px] font-semibold text-[#263B2C]">
              <Sparkles size={11} className="text-[#375A41]" />
              <span>Gemini Vision</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1F1D]">
            AI Food Photo Scanner
          </h1>
          <p className="text-xs sm:text-sm text-[#575E59] mt-0.5">
            Capture or upload a meal photo to identify foods, estimate portions, and log nutrition.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="sage" size="md">
            Stage 10 Active
          </Badge>
        </div>
      </div>

      {/* Hidden File Inputs for Native Camera & Gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file);
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file);
        }}
      />

      {/* UNAUTHENTICATED SESSION WARNING */}
      {isAuthenticated === false && (
        <div className="rounded-xl border border-[#EDC5A5] bg-[#FDF8F5] p-4 text-xs font-semibold text-[#8C4318] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Lock size={18} className="text-[#C26B38] shrink-0" />
            <span>Sign in required: You need an active LocalFit account to scan and save food photos.</span>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#437151] text-white text-xs font-medium hover:bg-[#375A41] transition-colors"
          >
            <span>Sign In</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* SUCCESS NOTIFICATION TOAST */}
      {loggedNotification && (
        <div className="rounded-xl border border-[#C7DBD0] bg-[#E2ECE4] p-4 text-xs font-semibold text-[#263B2C] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-[#375A41] shrink-0" />
            <span>{loggedNotification}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/app/food"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#375A41] text-white text-xs font-medium hover:bg-[#263B2C] transition-colors"
            >
              <span>View in Diary</span>
              <ArrowRight size={13} />
            </Link>
            <button
              onClick={() => setLoggedNotification(null)}
              className="px-2.5 py-1.5 rounded-lg border border-[#C7DBD0] bg-white text-[#263B2C] text-xs hover:bg-[#FAF8F5]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN WORKFLOW: Ingestion & Review */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* COLUMN 1: Camera Viewfinder & Image Ingestion */}
        <div className="space-y-6">
          <Card variant="default" className="p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-[#437151]" />
                <h2 className="text-base font-semibold text-[#1C1F1D]">Meal Photo</h2>
              </div>
              <span className="text-xs text-[#717A73]">
                {selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB` : "JPEG, PNG, WebP (Max 10MB)"}
              </span>
            </div>

            {/* Viewfinder Container */}
            <div
              className={`relative aspect-[4/3] w-full rounded-2xl bg-[#1C1F1D] overflow-hidden flex flex-col items-center justify-center p-6 text-white text-center shadow-inner transition-all ${
                screenState === "waiting_for_image"
                  ? "border-2 border-dashed border-[#575E59]/40 hover:border-[#C7DBD0]"
                  : ""
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileSelected(file);
              }}
            >
              {/* Corner Accents */}
              <div className="absolute top-4 left-4 h-6 w-6 border-t-2 border-l-2 border-[#C7DBD0]/80 rounded-tl-lg pointer-events-none z-10" />
              <div className="absolute top-4 right-4 h-6 w-6 border-t-2 border-r-2 border-[#C7DBD0]/80 rounded-tr-lg pointer-events-none z-10" />
              <div className="absolute bottom-4 left-4 h-6 w-6 border-b-2 border-l-2 border-[#C7DBD0]/80 rounded-bl-lg pointer-events-none z-10" />
              <div className="absolute bottom-4 right-4 h-6 w-6 border-b-2 border-r-2 border-[#C7DBD0]/80 rounded-br-lg pointer-events-none z-10" />

              {/* Viewfinder Content per Screen State */}
              {imagePreviewUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreviewUrl}
                    alt="Captured meal preview"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                  {/* Scanning Animation Overlay */}
                  {screenState === "scanning" && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20 space-y-3">
                      <div className="h-14 w-14 rounded-full border-2 border-[#C7DBD0] border-t-[#437151] animate-spin" />
                      <p className="text-xs font-semibold tracking-wider uppercase text-[#C7DBD0] animate-pulse">
                        {scanStepMessage || "Analyzing meal with Gemini..."}
                      </p>
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C7DBD0] to-transparent animate-bounce" />
                    </div>
                  )}

                  {/* Top-right overlay actions */}
                  {screenState !== "scanning" && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-black/60 text-white/90 hover:text-white hover:bg-black/80 text-xs font-medium transition-colors"
                        title="Replace photo"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleResetScanner}
                        className="p-1.5 rounded-lg bg-black/60 text-white/90 hover:text-white hover:bg-black/80 transition-colors"
                        title="Remove photo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </>
              ) : screenState === "scanning" ? (
                <div className="space-y-3 flex flex-col items-center">
                  <div className="h-14 w-14 rounded-full border-2 border-[#C7DBD0] border-t-[#437151] animate-spin" />
                  <p className="text-xs font-semibold tracking-wider uppercase text-[#C7DBD0]">
                    {scanStepMessage || "Processing Photo..."}
                  </p>
                </div>
              ) : (
                <div
                  className="space-y-3 flex flex-col items-center max-w-xs cursor-pointer"
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white mb-1 hover:bg-white/20 transition-colors">
                    <Camera size={24} />
                  </div>
                  <p className="text-sm font-semibold text-white">Center Meal on Plate</p>
                  <p className="text-xs text-[#BBC2BC] leading-relaxed">
                    Take a photo with your phone camera or upload a meal image. Natural lighting produces best results.
                  </p>
                </div>
              )}
            </div>

            {/* Ingestion Action Row */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={screenState === "scanning"}
                variant="outline"
                size="md"
                className="w-full"
                icon={<Camera size={16} className="text-[#437151]" />}
                iconPosition="left"
              >
                Take Photo
              </Button>

              <Button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={screenState === "scanning"}
                variant="outline"
                size="md"
                className="w-full"
                icon={<UploadCloud size={16} className="text-[#575E59]" />}
                iconPosition="left"
              >
                Upload Image
              </Button>
            </div>

            {/* Primary Scan Button */}
            {imagePreviewUrl && screenState === "image_selected" && (
              <Button
                type="button"
                onClick={handleScanImage}
                variant="primary"
                size="lg"
                className="w-full shadow-md"
                icon={<Sparkles size={16} />}
                iconPosition="left"
              >
                Analyze Food with Gemini
              </Button>
            )}

            {/* Quick Demo Test Dishes */}
            <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1C1F1D] flex items-center gap-1.5">
                  <Sparkles size={13} className="text-[#437151]" />
                  Instant Demo Test Meals
                </span>
                <span className="text-[10px] text-[#717A73]">Click to test</span>
              </div>
              <p className="text-[11px] text-[#575E59]">
                Test the multi-item review screen and portion editor with pre-analyzed authentic regional meals:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SAMPLE_TEST_MEALS.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => handleLoadSampleMeal(sample)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-[#E8E5DD] bg-white hover:border-[#437151] hover:text-[#437151] font-medium text-[#1C1F1D] transition-colors"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy & Transparency Notice */}
            <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-3 space-y-1 text-xs text-[#575E59]">
              <div className="flex items-center gap-1.5 font-semibold text-[#1C1F1D]">
                <Info size={13} className="text-[#437151]" />
                <span>Image Privacy & AI Transparency</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Images are processed in transient memory solely to extract nutritional estimates. Photographs are never stored permanently without your consent. Hidden oils and seasonings cannot be measured by a camera and require user review.
              </p>
            </div>
          </Card>
        </div>

        {/* COLUMN 2: Nutritional Review & Confirmation Screen */}
        <div className="space-y-6">
          <Card variant="default" className="p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
              <div>
                <h2 className="text-base font-semibold text-[#1C1F1D]">Meal Nutritional Review</h2>
                <p className="text-xs text-[#575E59]">
                  {mealSummary || "Review and adjust portions before saving to diary"}
                </p>
              </div>

              {screenState === "results_ready" && (
                <Badge variant="sage" size="sm">
                  {identifiedItems.length} {identifiedItems.length === 1 ? "Food" : "Foods"} Detected
                </Badge>
              )}
            </div>

            {/* ERROR CARD: UNAUTHORIZED */}
            {screenState === "unauthorized" && (
              <div className="rounded-2xl border border-[#EDC5A5] bg-[#FDF8F5] p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <Lock size={20} className="text-[#C26B38] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-[#8C4318]">Authentication Required</h3>
                    <p className="text-xs text-[#575E59] leading-relaxed">
                      {errorMessage || "You must be signed in to your LocalFit account to use the food photo scanner."}
                    </p>
                  </div>
                </div>
                <div className="pt-2 flex gap-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#437151] text-white text-xs font-semibold hover:bg-[#375A41]"
                  >
                    <span>Sign In</span>
                  </Link>
                </div>
              </div>
            )}

            {/* ERROR CARD: API KEY NOT CONFIGURED */}
            {screenState === "api_key_not_configured" && (
              <div className="rounded-2xl border border-[#EDC5A5] bg-[#FDF8F5] p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-[#C26B38] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-[#8C4318]">Gemini API Key Required</h3>
                    <p className="text-xs text-[#575E59] leading-relaxed">
                      To enable live image scanning, configure your Gemini API key in{" "}
                      <code className="rounded bg-[#EFEBE1] px-1.5 py-0.5 text-[#1C1F1D] font-mono text-[11px]">
                        .env.local
                      </code>
                      :
                    </p>
                    <pre className="rounded-lg bg-[#FAF8F5] p-2.5 text-[11px] font-mono text-[#1C1F1D] border border-[#E8E5DD]">
                      GEMINI_API_KEY=your_key_here
                    </pre>
                  </div>
                </div>
                <div className="pt-2 flex flex-wrap gap-2">
                  <Link
                    href="/app/food"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#437151] text-white text-xs font-semibold hover:bg-[#375A41]"
                  >
                    <span>Log Food Manually</span>
                  </Link>
                  <Button
                    type="button"
                    onClick={() => handleLoadSampleMeal(SAMPLE_TEST_MEALS[0])}
                    variant="outline"
                    size="sm"
                  >
                    Try Sample Meal Instead
                  </Button>
                </div>
              </div>
            )}

            {/* ERROR CARD: QUOTA EXCEEDED */}
            {screenState === "quota_exceeded" && (
              <div className="rounded-2xl border border-[#E8D098] bg-[#FDFBF7] p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-[#997324] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-[#664D18]">Scanning Limit Reached</h3>
                    <p className="text-xs text-[#575E59] leading-relaxed">
                      {errorMessage || "Scanning request limit reached. Please wait a few moments or log your meal manually."}
                    </p>
                  </div>
                </div>
                <div className="pt-1 flex gap-2">
                  <Link
                    href="/app/food"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#437151] text-white text-xs font-semibold"
                  >
                    <span>Manual Food Entry</span>
                  </Link>
                  <Button type="button" onClick={handleScanImage} variant="outline" size="sm">
                    Retry Scan
                  </Button>
                </div>
              </div>
            )}

            {/* ERROR CARD: PAYLOAD TOO LARGE */}
            {screenState === "payload_too_large" && (
              <div className="rounded-2xl border border-[#F0B8B8] bg-[#FDF2F2] p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-[#B33A3A] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-[#7D2424]">Image Too Large</h3>
                    <p className="text-xs text-[#575E59]">
                      {errorMessage || "Image exceeds the maximum allowed file size of 10MB. Please choose a smaller photo."}
                    </p>
                  </div>
                </div>
                <div className="pt-1 flex gap-2">
                  <Button type="button" onClick={handleResetScanner} variant="outline" size="sm">
                    Select Another Photo
                  </Button>
                </div>
              </div>
            )}

            {/* ERROR CARD: NO FOOD DETECTED */}
            {screenState === "no_food_detected" && (
              <div className="rounded-2xl border border-[#E8E5DD] bg-[#FAF8F5] p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <HelpCircle size={20} className="text-[#717A73] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-[#1C1F1D]">No Food Detected</h3>
                    <p className="text-xs text-[#575E59] leading-relaxed">
                      {errorMessage || "We could not detect recognizable food in this image. Please center your plate under good lighting and try again."}
                    </p>
                  </div>
                </div>
                <div className="pt-1 flex gap-2">
                  <Button type="button" onClick={handleResetScanner} variant="primary" size="sm">
                    Take New Photo
                  </Button>
                  <Link
                    href="/app/food"
                    className="inline-flex items-center px-3 py-1.5 rounded-lg border border-[#E8E5DD] bg-white text-xs font-medium text-[#1C1F1D]"
                  >
                    Search Database Manually
                  </Link>
                </div>
              </div>
            )}

            {/* GENERIC SCAN ERROR */}
            {screenState === "scan_failed" && (
              <div className="rounded-2xl border border-[#F0B8B8] bg-[#FDF2F2] p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-[#B33A3A] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-[#7D2424]">Scan Failed</h3>
                    <p className="text-xs text-[#575E59]">
                      {errorMessage || "An unexpected error occurred while analyzing the image."}
                    </p>
                  </div>
                </div>
                <div className="pt-1 flex gap-2">
                  <Button type="button" onClick={handleScanImage} variant="primary" size="sm">
                    Retry Analysis
                  </Button>
                  <Button type="button" onClick={handleResetScanner} variant="outline" size="sm">
                    Choose Another Photo
                  </Button>
                </div>
              </div>
            )}

            {/* IDLE / WAITING STATE GUIDANCE */}
            {(screenState === "waiting_for_image" || screenState === "image_selected") && (
              <div className="space-y-4 py-8 text-center">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-[#E2ECE4] flex items-center justify-center text-[#437151]">
                  <Sparkles size={24} />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="text-sm font-semibold text-[#1C1F1D]">
                    {screenState === "image_selected" ? "Ready to Analyze Meal" : "Capture Your Meal to Begin"}
                  </h3>
                  <p className="text-xs text-[#575E59] leading-relaxed">
                    {screenState === "image_selected"
                      ? "Click 'Analyze Food with Gemini' to identify all items on the plate and calculate portion macros."
                      : "Take a picture of your meal. LocalFit identifies individual food items, estimates weights, and calculates nutrition for review."}
                  </p>
                </div>
              </div>
            )}

            {/* RESULTS READY: MULTI-ITEM REVIEW & CONFIRMATION */}
            {screenState === "results_ready" && (
              <div className="space-y-5">
                {/* AI ESTIMATE DISCLAIMER BANNER */}
                <div className="rounded-xl border border-[#DBE0C1] bg-[#EDF0DF] p-3 text-xs text-[#43492D] flex items-start gap-2">
                  <Info size={16} className="text-[#6B7546] shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    <strong>AI Visual Approximation:</strong> Weights and hidden cooking oils are approximations. Review names, adjust portions, or delete items before saving.
                  </span>
                </div>

                {/* COMBINED MEAL TOTALS SNAPSHOT */}
                <div className="rounded-xl border border-[#C7DBD0] bg-[#E2ECE4]/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#263B2C] uppercase tracking-wider">
                      Selected Meal Totals ({selectedItems.length} {selectedItems.length === 1 ? "item" : "items"})
                    </span>
                    <span className="text-xs font-bold text-[#375A41]">
                      {mealTotalCalories} kcal
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-white p-2 border border-[#C7DBD0]">
                      <span className="block font-bold text-[#1C1F1D]">{mealTotalCalories}</span>
                      <span className="text-[10px] text-[#717A73] uppercase">Calories</span>
                    </div>
                    <div className="rounded-lg bg-white p-2 border border-[#C7DBD0]">
                      <span className="block font-bold text-[#263B2C]">{mealTotalProtein}g</span>
                      <span className="text-[10px] text-[#375A41] uppercase">Protein</span>
                    </div>
                    <div className="rounded-lg bg-white p-2 border border-[#C7DBD0]">
                      <span className="block font-bold text-[#43492D]">{mealTotalCarbs}g</span>
                      <span className="text-[10px] text-[#6B7546] uppercase">Carbs</span>
                    </div>
                    <div className="rounded-lg bg-white p-2 border border-[#C7DBD0]">
                      <span className="block font-bold text-[#1C1F1D]">{mealTotalFat}g</span>
                      <span className="text-[10px] text-[#717A73] uppercase">Fat</span>
                    </div>
                  </div>
                </div>

                {/* LIST OF IDENTIFIED FOOD ITEMS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">
                      Identified Foods on Plate
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingManualItem(!isAddingManualItem)}
                      className="text-xs font-semibold text-[#437151] hover:underline flex items-center gap-1"
                    >
                      <PlusCircle size={13} />
                      <span>Add Missing Food</span>
                    </button>
                  </div>

                  {/* Manual Food Addition Form */}
                  {isAddingManualItem && (
                    <div className="rounded-xl border border-[#C7DBD0] bg-white p-4 space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1C1F1D]">Add Food to Plate</span>
                        <button
                          type="button"
                          onClick={() => setIsAddingManualItem(false)}
                          className="text-xs text-[#717A73] hover:text-[#1C1F1D]"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Food name (e.g. Papad, Pickle, Salad)"
                          value={newFoodName}
                          onChange={(e) => setNewFoodName(e.target.value)}
                          className="w-full rounded-lg border border-[#E8E5DD] px-3 py-1.5 text-xs text-[#1C1F1D]"
                        />

                        <div className="grid grid-cols-5 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-[#717A73]">Grams</label>
                            <input
                              type="number"
                              value={newPortionG}
                              onChange={(e) => setNewPortionG(Math.max(10, parseInt(e.target.value) || 0))}
                              className="w-full rounded border border-[#E8E5DD] p-1 text-center font-medium"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#717A73]">Calories</label>
                            <input
                              type="number"
                              value={newCalories}
                              onChange={(e) => setNewCalories(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-full rounded border border-[#E8E5DD] p-1 text-center font-medium"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#717A73]">Protein (g)</label>
                            <input
                              type="number"
                              step="0.5"
                              value={newProtein}
                              onChange={(e) => setNewProtein(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full rounded border border-[#E8E5DD] p-1 text-center font-medium"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#717A73]">Carbs (g)</label>
                            <input
                              type="number"
                              step="0.5"
                              value={newCarbs}
                              onChange={(e) => setNewCarbs(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full rounded border border-[#E8E5DD] p-1 text-center font-medium"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#717A73]">Fat (g)</label>
                            <input
                              type="number"
                              step="0.5"
                              value={newFat}
                              onChange={(e) => setNewFat(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full rounded border border-[#E8E5DD] p-1 text-center font-medium"
                            />
                          </div>
                        </div>

                        <Button
                          type="button"
                          onClick={handleAddManualItem}
                          disabled={!newFoodName.trim()}
                          size="sm"
                          variant="primary"
                          className="w-full mt-2"
                        >
                          Add to Meal
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Identified Item Cards */}
                  {identifiedItems.length === 0 ? (
                    <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-4 text-center text-xs text-[#717A73]">
                      No items currently on this plate. Click &quot;Add Missing Food&quot; above to add one manually.
                    </div>
                  ) : (
                    identifiedItems.map((item) => {
                      const isSelected = item.selected_for_saving !== false;
                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl border transition-all p-4 space-y-3 ${
                            isSelected
                              ? "border-[#C7DBD0] bg-white shadow-xs"
                              : "border-[#E8E5DD] bg-[#FAF8F5] opacity-60"
                          }`}
                        >
                          {/* Card Top: Checkbox, Name, Confidence & Delete */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleItemSelection(item.id)}
                                className="h-4 w-4 rounded border-[#C7DBD0] text-[#437151] focus:ring-[#437151] cursor-pointer"
                                title="Include/exclude this food"
                              />

                              <div className="flex-1 space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={item.food_name}
                                    onChange={(e) => handleItemNameChange(item.id, e.target.value)}
                                    className="font-semibold text-sm text-[#1C1F1D] bg-transparent border-b border-transparent hover:border-[#C7DBD0] focus:border-[#437151] focus:outline-none w-full max-w-sm"
                                  />
                                  <Edit3 size={11} className="text-[#717A73] shrink-0" />
                                </div>

                                {item.alternative_names.length > 0 && (
                                  <p className="text-[11px] text-[#717A73]">
                                    Also: {item.alternative_names.join(", ")}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.is_catalogue_match ? (
                                <Badge variant="sage" size="sm" className="gap-1">
                                  <ShieldCheck size={11} className="text-[#375A41]" />
                                  <span>Verified Match</span>
                                </Badge>
                              ) : (
                                getConfidenceBadge(item.confidence)
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1 rounded-lg text-[#717A73] hover:text-[#B33A3A] hover:bg-[#FDF2F2] transition-colors"
                                title="Remove item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Portion Size Adjustment: Slider & Steppers */}
                          <div className="rounded-lg border border-[#E8E5DD] bg-[#FAF8F5] p-3 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-[#575E59] flex items-center gap-1">
                                <Sliders size={12} className="text-[#437151]" />
                                Portion Size:
                              </span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="10"
                                  max="2500"
                                  value={item.portion_grams}
                                  onChange={(e) =>
                                    handleItemPortionChange(item.id, parseFloat(e.target.value) || 0)
                                  }
                                  className="w-16 text-right font-bold text-xs text-[#437151] bg-white rounded border border-[#E8E5DD] px-1 py-0.5"
                                />
                                <span className="text-xs font-semibold text-[#575E59]">g</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleItemPortionChange(item.id, item.portion_grams - 25)
                                }
                                className="p-1 rounded border border-[#E8E5DD] bg-white text-[#1C1F1D] hover:bg-[#EFEBE1]"
                                title="Decrease 25g"
                              >
                                <Minus size={12} />
                              </button>
                              <input
                                type="range"
                                min="20"
                                max="800"
                                step="10"
                                value={item.portion_grams}
                                onChange={(e) =>
                                  handleItemPortionChange(item.id, parseFloat(e.target.value))
                                }
                                className="flex-1 accent-[#437151] cursor-pointer"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleItemPortionChange(item.id, item.portion_grams + 25)
                                }
                                className="p-1 rounded border border-[#E8E5DD] bg-white text-[#1C1F1D] hover:bg-[#EFEBE1]"
                                title="Increase 25g"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Dynamic Macro Row */}
                          <div className="grid grid-cols-4 gap-2 text-center text-xs">
                            <div className="p-1.5 rounded-lg bg-[#FAF8F5] border border-[#E8E5DD]">
                              <span className="block font-bold text-[#1C1F1D]">
                                {item.calories !== null ? `${item.calories}` : "—"}
                              </span>
                              <span className="text-[9px] text-[#717A73] uppercase">Calories</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-[#E2ECE4] border border-[#C7DBD0]">
                              <span className="block font-bold text-[#263B2C]">
                                {item.protein_g !== null ? `${item.protein_g}g` : "—"}
                              </span>
                              <span className="text-[9px] text-[#375A41] uppercase">Protein</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-[#EDF0DF] border border-[#DBE0C1]">
                              <span className="block font-bold text-[#43492D]">
                                {item.carbs_g !== null ? `${item.carbs_g}g` : "—"}
                              </span>
                              <span className="text-[9px] text-[#6B7546] uppercase">Carbs</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-[#FAF8F5] border border-[#E8E5DD]">
                              <span className="block font-bold text-[#1C1F1D]">
                                {item.fat_g !== null ? `${item.fat_g}g` : "—"}
                              </span>
                              <span className="text-[9px] text-[#717A73] uppercase">Fat</span>
                            </div>
                          </div>

                          {/* Notes / Uncertainty */}
                          {item.notes && (
                            <p className="text-[11px] text-[#717A73] italic leading-tight">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* TARGET MEAL CATEGORY & NOTES */}
                <div className="space-y-4 pt-4 border-t border-[#E8E5DD]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#575E59]">Log into Meal Slot:</span>
                    <div className="flex gap-1.5">
                      {(["Breakfast", "Lunch", "Dinner", "Snacks"] as const).map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedMealType(slot)}
                          className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                            selectedMealType === slot
                              ? "bg-[#437151] text-white font-semibold"
                              : "bg-[#FAF8F5] text-[#575E59] border border-[#E8E5DD] hover:text-[#1C1F1D]"
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Meal Notes Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#575E59]">
                      Optional Meal Notes:
                    </label>
                    <input
                      type="text"
                      maxLength={500}
                      placeholder="e.g. Lunch at home, low oil preparation"
                      value={mealNotes}
                      onChange={(e) => setMealNotes(e.target.value)}
                      className="w-full rounded-lg border border-[#E8E5DD] bg-[#FAF8F5] px-3 py-1.5 text-xs text-[#1C1F1D] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#437151]"
                    />
                  </div>

                  {/* Explicit Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    <Button
                      type="button"
                      onClick={handleConfirmAddToDiary}
                      disabled={isLogging || selectedItems.length === 0}
                      size="lg"
                      variant="primary"
                      className="w-full shadow-sm"
                      icon={<Check size={16} />}
                      iconPosition="left"
                    >
                      {isLogging
                        ? "Saving to Diary..."
                        : `Save ${selectedItems.length} ${
                            selectedItems.length === 1 ? "Item" : "Items"
                          } to Diary`}
                    </Button>

                    <Button
                      type="button"
                      onClick={handleResetScanner}
                      variant="outline"
                      size="lg"
                      className="w-full"
                      icon={<RotateCcw size={14} />}
                      iconPosition="left"
                    >
                      Scan Another Meal
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

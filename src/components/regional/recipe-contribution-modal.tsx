"use client";

import * as React from "react";
import {
  X,
  Sparkles,
  Send,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitRegionalRecipe } from "@/lib/regional-food-data";
import {
  REGIONAL_REGIONS,
  REGIONAL_CUISINES,
  REGIONAL_CATEGORIES,
} from "@/types/regional-food";

interface RecipeContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function RecipeContributionModal({
  isOpen,
  onClose,
  onSubmitted,
}: RecipeContributionModalProps) {
  const [dishName, setDishName] = React.useState("");
  const [localName, setLocalName] = React.useState("");
  const [region, setRegion] = React.useState<string>("Bhatkal");
  const [locality, setLocality] = React.useState("Navayath");
  const [cuisine, setCuisine] = React.useState<string>("Bhatkal cuisine");
  const [category, setCategory] = React.useState<string>("Rice dishes");
  const [ingredientsText, setIngredientsText] = React.useState("");
  const [cookingInstructions, setCookingInstructions] = React.useState("");
  const [servingCount, setServingCount] = React.useState<number>(4);
  const [sourceAttribution, setSourceAttribution] = React.useState("");

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submissionSuccess, setSubmissionSuccess] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!dishName.trim()) {
      setErrorMessage("Please enter a dish name.");
      return;
    }
    if (!ingredientsText.trim()) {
      setErrorMessage("Please provide ingredients and quantities.");
      return;
    }
    if (!cookingInstructions.trim()) {
      setErrorMessage("Please outline traditional cooking instructions.");
      return;
    }
    if (!sourceAttribution.trim()) {
      setErrorMessage("Please record the recipe's origin or family source attribution.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitRegionalRecipe({
        dish_name: dishName,
        local_name: localName || undefined,
        region,
        locality: locality || undefined,
        cuisine,
        category,
        ingredients_text: ingredientsText,
        cooking_instructions: cookingInstructions,
        serving_count: servingCount,
        source_attribution: sourceAttribution,
      });

      if (result.success) {
        setSubmissionSuccess(true);
        if (onSubmitted) onSubmitted();
      } else {
        setErrorMessage(result.message || "Could not submit recipe.");
      }
    } catch {
      setErrorMessage("Network error occurred during recipe submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setDishName("");
    setLocalName("");
    setIngredientsText("");
    setCookingInstructions("");
    setSourceAttribution("");
    setSubmissionSuccess(false);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-[#E8E5DD] shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Close Button */}
        <button
          onClick={handleResetAndClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-[#717A73] hover:text-[#1C1F1D] hover:bg-[#FAF8F5] transition-colors"
          title="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 pr-8">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#437151]">
            <Sparkles size={14} />
            <span>Community Heritage Archive</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1C1F1D]">
            Contribute a Regional Recipe
          </h2>
          <p className="text-xs text-[#575E59]">
            Submit traditional preparations from Bhatkal, Murdeshwar, and Coastal Karnataka.
          </p>
        </div>

        {/* Submission Success Screen */}
        {submissionSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-[#E2ECE4] text-[#375A41] flex items-center justify-center">
              <CheckCircle2 size={28} />
            </div>
            <div className="space-y-1.5 max-w-sm mx-auto">
              <h3 className="text-base font-bold text-[#1C1F1D]">
                Recipe Queued for Review
              </h3>
              <p className="text-xs text-[#575E59] leading-relaxed">
                Thank you for contributing to the preservation of coastal food knowledge. Your submission is held securely in <strong>pending</strong> status and will be verified by traditional culinary curators before public publication.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleResetAndClose}
              variant="primary"
              size="md"
              className="mt-2"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Security & Verification Notice */}
            <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-3 text-xs text-[#575E59] flex items-start gap-2.5">
              <Info size={16} className="text-[#437151] shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                <strong>Curator Review Policy:</strong> To prevent invented or contradictory nutrition data, all community submissions are held in <em>pending</em> status until verified against ICMR-NIN IFCT standards and authentic regional records.
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-[#F0B8B8] bg-[#FDF2F2] p-3 text-xs font-medium text-[#B33A3A]">
                {errorMessage}
              </div>
            )}

            {/* Row 1: Dish Name & Local Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1C1F1D]">
                  Dish Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bhatkal Appa"
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151] focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1C1F1D]">
                  Local / Dialect Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Navayath Appa / Bhatkally Pulao"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151] focus:bg-white"
                />
              </div>
            </div>

            {/* Row 2: Region, Locality, Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1C1F1D]">
                  Region *
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151] focus:bg-white"
                >
                  {REGIONAL_REGIONS.filter((r) => r !== "All Regions").map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1C1F1D]">
                  Locality / Heritage
                </label>
                <input
                  type="text"
                  placeholder="e.g. Navayath / Fisherfolk"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151] focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1C1F1D]">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151] focus:bg-white"
                >
                  {REGIONAL_CATEGORIES.filter((c) => c !== "All Categories").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Servings & Cuisine */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1C1F1D]">
                  Cuisine *
                </label>
                <select
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151] focus:bg-white"
                >
                  {REGIONAL_CUISINES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1C1F1D]">
                  Default Servings Count *
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={servingCount}
                  onChange={(e) => setServingCount(parseInt(e.target.value) || 4)}
                  className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151] focus:bg-white"
                />
              </div>
            </div>

            {/* Ingredients & Quantities */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1C1F1D] flex justify-between">
                <span>Ingredients & Quantities (with weights in grams) *</span>
                <span className="text-[10px] text-[#717A73]">e.g. 200g Rice, 50g Coconut</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="List each ingredient and quantity, e.g.:&#10;- 400g Basmati Rice&#10;- 500g Chicken (bone-in)&#10;- 30g Desi Ghee&#10;- 150g Curd"
                value={ingredientsText}
                onChange={(e) => setIngredientsText(e.target.value)}
                className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151] focus:bg-white leading-relaxed font-mono"
              />
            </div>

            {/* Cooking Instructions */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1C1F1D]">
                Traditional Cooking Instructions *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Step-by-step traditional method, e.g. marination, layered dum steaming, earthenware simmering..."
                value={cookingInstructions}
                onChange={(e) => setCookingInstructions(e.target.value)}
                className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151] focus:bg-white leading-relaxed"
              />
            </div>

            {/* Source Attribution */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1C1F1D] flex justify-between">
                <span>Source Attribution & Heritage Notes *</span>
                <span className="text-[10px] text-[#717A73]">No AI-generated recipes</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Family heirloom recipe, 3 generations, Bhatkal Navayath household"
                value={sourceAttribution}
                onChange={(e) => setSourceAttribution(e.target.value)}
                className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151] focus:bg-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex gap-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                variant="primary"
                size="md"
                className="flex-1"
                icon={<Send size={15} />}
                iconPosition="left"
              >
                {isSubmitting ? "Submitting..." : "Submit for Verification"}
              </Button>
              <Button
                type="button"
                onClick={handleResetAndClose}
                variant="outline"
                size="md"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

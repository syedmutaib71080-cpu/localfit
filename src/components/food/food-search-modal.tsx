"use client";

import * as React from "react";
import {
  Search,
  SlidersHorizontal,
  ShieldCheck,
  AlertCircle,
  Database,
  PenTool,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FoodCatalogueItem, MealType } from "@/types/nutrition-tracking";
import { ALL_FOOD_CATEGORIES } from "@/types/nutrition";
import { fetchFoodCatalogue } from "@/lib/nutrition-client";

interface FoodSearchModalProps {
  isOpen: boolean;
  activeMealType: MealType | null;
  onClose: () => void;
  onSelectFood: (food: FoodCatalogueItem) => void;
  onOpenManualEntry: () => void;
}

export function FoodSearchModal({
  isOpen,
  activeMealType,
  onClose,
  onSelectFood,
  onOpenManualEntry,
}: FoodSearchModalProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [items, setItems] = React.useState<FoodCatalogueItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Debounced search effect
  React.useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const timer = setTimeout(async () => {
      if (!isMounted) return;
      setIsLoading(true);
      setErrorMessage(null);

      const res = await fetchFoodCatalogue({
        q: searchQuery,
        category: selectedCategory === "all" ? undefined : selectedCategory,
        limit: 50,
      });

      if (isMounted) {
        setIsLoading(false);
        if (res.error) {
          setErrorMessage(res.error);
        } else {
          setItems(res.items);
        }
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, searchQuery, selectedCategory]);

  if (!isOpen) return null;

  const mealTitle = activeMealType
    ? activeMealType.charAt(0).toUpperCase() + activeMealType.slice(1)
    : "Meal";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-2xl space-y-4 my-8 animate-in fade-in-50 zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-[#437151]" />
              <h3 id="search-modal-title" className="text-lg font-semibold text-[#1C1F1D]">
                Add Food to {mealTitle}
              </h3>
            </div>
            <p className="text-xs text-[#575E59]">
              Search verified ICMR-NIN nutrition database, regional recipes, or filter by category
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#717A73] hover:text-[#1C1F1D] text-lg font-medium p-1 rounded-lg"
            aria-label="Close food search modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-3 text-[#717A73]" />
          <input
            type="text"
            placeholder="Search by English or local name (e.g. Rice, Bhat, Roti, Pomfret, Paneer)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] pl-10 pr-4 py-2.5 text-sm text-[#1C1F1D] focus:outline-none focus:ring-2 focus:ring-[#437151]"
            autoFocus
          />
        </div>

        {/* Category Filter Pills */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-[#717A73]">
            <span className="flex items-center gap-1 font-semibold uppercase tracking-wider text-[#575E59]">
              <SlidersHorizontal size={12} />
              <span>Category Filter</span>
            </span>
            <span>{items.length} items found</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === "all"
                  ? "bg-[#437151] text-white"
                  : "bg-[#FAF8F5] border border-[#E8E5DD] text-[#575E59] hover:text-[#1C1F1D]"
              }`}
            >
              All Categories
            </button>
            {ALL_FOOD_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-[#437151] text-white"
                    : "bg-[#FAF8F5] border border-[#E8E5DD] text-[#575E59] hover:text-[#1C1F1D]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {errorMessage && (
          <div className="p-3 text-xs text-[#B91C1C] bg-[#FEE2E2] rounded-xl border border-[#FCA5A5]">
            {errorMessage}
          </div>
        )}

        {/* Food Results List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-[#E8E5DD] border border-[#E8E5DD] rounded-xl bg-white">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-[#717A73] flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-[#437151]" />
              <span>Searching food catalogue...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#717A73] space-y-2">
              <p className="font-medium text-[#1C1F1D]">
                No foods found{searchQuery ? ` matching "${searchQuery}"` : ""}.
              </p>
              <Button
                type="button"
                onClick={onOpenManualEntry}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Add as Custom Personal Entry
              </Button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectFood(item)}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF8F5] cursor-pointer transition-colors group"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold text-[#1C1F1D] group-hover:text-[#437151] transition-colors">
                      {item.name}
                    </span>
                    {item.local_name && (
                      <span className="text-xs text-[#717A73] italic">
                        ({item.local_name})
                      </span>
                    )}
                    {item.is_verified ? (
                      <span
                        title="Verified with ICMR-NIN or national database"
                        className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#375A41] bg-[#E2ECE4] border border-[#C7DBD0] rounded px-1.5 py-0.2"
                      >
                        <ShieldCheck size={10} />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span
                        title="Estimated regional recipe formulation"
                        className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#8F5E16] bg-[#FDF6E2] border border-[#E8D49E] rounded px-1.5 py-0.2"
                      >
                        <AlertCircle size={10} />
                        <span>Estimated</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#575E59]">
                    <span className="font-medium">{item.category}</span>
                    {item.region && (
                      <>
                        <span className="text-[#A2AAA4]">•</span>
                        <span className="text-[11px] text-[#717A73]">{item.region}</span>
                      </>
                    )}
                    {item.serving_name && (
                      <>
                        <span className="text-[#A2AAA4]">•</span>
                        <span className="text-[11px] text-[#437151] font-medium">
                          Serving: {item.serving_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="text-left sm:text-right">
                    <span className="text-sm font-bold text-[#1C1F1D]">
                      {item.calories_per_100g !== null ? `${item.calories_per_100g} kcal` : "— kcal"}
                    </span>
                    <p className="text-[11px] text-[#575E59]">
                      P: {item.protein_per_100g !== null ? `${item.protein_per_100g}g` : "—"} • C:{" "}
                      {item.carbohydrates_per_100g !== null ? `${item.carbohydrates_per_100g}g` : "—"} • F:{" "}
                      {item.fat_per_100g !== null ? `${item.fat_per_100g}g` : "—"}
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="text-xs h-7 px-3 group-hover:bg-[#437151] group-hover:text-white transition-colors"
                  >
                    Select
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 text-xs text-[#717A73]">
          <button
            type="button"
            onClick={onOpenManualEntry}
            className="text-[#437151] font-semibold hover:underline flex items-center gap-1"
          >
            <PenTool size={13} />
            <span>Cannot find food? Enter manually</span>
          </button>

          <Button onClick={onClose} variant="outline" size="sm">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

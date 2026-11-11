"use client";

import * as React from "react";
import Link from "next/link";
import {
  Compass,
  Search,
  Plus,
  ShieldCheck,
  Sparkles,
  Clock,
  Users,
  Utensils,
  ChevronLeft,
  BookOpen,
  Filter,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import {
  searchRegionalRecipes,
  getUserRecipeSubmissions,
} from "@/lib/regional-food-data";
import { RecipeDetailModal } from "@/components/regional/recipe-detail-modal";
import { RecipeContributionModal } from "@/components/regional/recipe-contribution-modal";
import {
  REGIONAL_REGIONS,
  REGIONAL_CATEGORIES,
  type RegionalRecipe,
  type RegionalRegion,
  type RegionalCategory,
  type RecipeSubmission,
} from "@/types/regional-food";

export default function RegionalFoodIntelligencePage() {
  const [recipes, setRecipes] = React.useState<RegionalRecipe[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedRegion, setSelectedRegion] = React.useState<RegionalRegion>("All Regions");
  const [selectedCategory, setSelectedCategory] = React.useState<RegionalCategory>("All Categories");
  const [verificationFilter, setVerificationFilter] = React.useState<"all" | "verified" | "estimated">("all");

  // View state: 'catalogue' or 'my_submissions'
  const [activeTab, setActiveTab] = React.useState<"catalogue" | "submissions">("catalogue");
  const [userSubmissions, setUserSubmissions] = React.useState<RecipeSubmission[]>([]);

  // Modals state
  const [selectedRecipeForDetail, setSelectedRecipeForDetail] = React.useState<RegionalRecipe | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);
  const [isContributionModalOpen, setIsContributionModalOpen] = React.useState(false);

  // Fetch regional recipes when filters change
  React.useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchRegionalRecipes({
          query: searchQuery,
          region: selectedRegion,
          category: selectedCategory,
          verificationStatus: verificationFilter,
        });
        if (isMounted) {
          setRecipes(results);
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedRegion, selectedCategory, verificationFilter]);

  // Load user submissions when switching to submissions tab
  React.useEffect(() => {
    if (activeTab === "submissions") {
      let isMounted = true;
      getUserRecipeSubmissions().then((subs) => {
        if (isMounted) {
          setUserSubmissions(subs);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [activeTab]);

  const handleRefreshSubmissions = React.useCallback(() => {
    getUserRecipeSubmissions().then((subs) => {
      setUserSubmissions(subs);
    });
  }, []);

  const openRecipeDetail = (recipe: RegionalRecipe) => {
    setSelectedRecipeForDetail(recipe);
    setIsDetailModalOpen(true);
  };

  return (
    <PageContainer size="wide" className="space-y-8">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#E8E5DD]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/app/dashboard"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#437151] hover:underline"
            >
              <ChevronLeft size={14} />
              <span>Back to Dashboard</span>
            </Link>
            <span className="text-[#D5D1C5]">•</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C7DBD0] bg-[#E2ECE4] px-2 py-0.5 text-[10px] font-semibold text-[#263B2C]">
              <Compass size={11} className="text-[#375A41]" />
              <span>Coastal Intelligence</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1F1D]">
            Bhatkal & Murdeshwar Food Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-[#575E59] mt-0.5">
            Nutritional mapping and recipe formulations for Navayath, Murdeshwar fisherfolk, and Karavali coastal dishes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsContributionModalOpen(true)}
            size="md"
            variant="primary"
            icon={<Plus size={16} />}
            iconPosition="left"
          >
            Contribute Recipe
          </Button>
        </div>
      </div>

      {/* Main Tab Toggle: Catalogue vs My Submissions */}
      <div className="flex items-center gap-3 border-b border-[#E8E5DD] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("catalogue")}
          className={`flex items-center gap-2 pb-1 text-sm font-semibold transition-colors border-b-2 -mb-3.5 px-1 ${
            activeTab === "catalogue"
              ? "border-[#437151] text-[#437151]"
              : "border-transparent text-[#717A73] hover:text-[#1C1F1D]"
          }`}
        >
          <BookOpen size={16} />
          <span>Regional Recipe Archive ({recipes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("submissions")}
          className={`flex items-center gap-2 pb-1 text-sm font-semibold transition-colors border-b-2 -mb-3.5 px-1 ${
            activeTab === "submissions"
              ? "border-[#437151] text-[#437151]"
              : "border-transparent text-[#717A73] hover:text-[#1C1F1D]"
          }`}
        >
          <FileText size={16} />
          <span>My Contributions ({userSubmissions.length})</span>
        </button>
      </div>

      {/* TAB 1: REGIONAL CATALOGUE EXPLORER */}
      {activeTab === "catalogue" && (
        <div className="space-y-6">
          {/* SEARCH & FILTERS CONTROLS */}
          <Card variant="default" className="p-5 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717A73]"
              />
              <input
                type="text"
                placeholder="Search by dish name, local Navayati/Kannada name, alias, or ingredient (e.g. Biryani, Pomfret, Neer Dosa)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151] focus:bg-white transition-colors"
              />
            </div>

            {/* Region Selector Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#575E59] mr-1 flex items-center gap-1">
                <Compass size={13} className="text-[#437151]" /> Region:
              </span>
              {REGIONAL_REGIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRegion(r)}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors font-medium ${
                    selectedRegion === r
                      ? "bg-[#437151] text-white"
                      : "bg-[#FAF8F5] text-[#575E59] border border-[#E8E5DD] hover:text-[#1C1F1D]"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Category Selector Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#E8E5DD]">
              <span className="text-xs font-semibold text-[#575E59] mr-1 flex items-center gap-1">
                <Filter size={13} className="text-[#437151]" /> Category:
              </span>
              {REGIONAL_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCategory(c)}
                  className={`px-2.5 py-0.5 text-xs rounded-md transition-colors ${
                    selectedCategory === c
                      ? "bg-[#263B2C] text-white font-medium"
                      : "bg-[#FAF8F5] text-[#717A73] hover:text-[#1C1F1D]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Verification Status Toggle */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E8E5DD]">
              <div className="flex items-center gap-2">
                <span className="text-[#717A73]">Verification Filter:</span>
                <button
                  type="button"
                  onClick={() => setVerificationFilter("all")}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    verificationFilter === "all"
                      ? "bg-[#EFEBE1] text-[#1C1F1D]"
                      : "text-[#717A73] hover:text-[#1C1F1D]"
                  }`}
                >
                  All ({recipes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVerificationFilter("verified")}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    verificationFilter === "verified"
                      ? "bg-[#E2ECE4] text-[#263B2C]"
                      : "text-[#717A73] hover:text-[#1C1F1D]"
                  }`}
                >
                  Verified Only
                </button>
                <button
                  type="button"
                  onClick={() => setVerificationFilter("estimated")}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    verificationFilter === "estimated"
                      ? "bg-[#FAF8F5] text-[#6B7546] border border-[#E8E5DD]"
                      : "text-[#717A73] hover:text-[#1C1F1D]"
                  }`}
                >
                  Traditional (Estimated)
                </button>
              </div>

              <span className="text-[11px] text-[#717A73]">
                Nutrient calculations: ICMR-NIN IFCT 2017
              </span>
            </div>
          </Card>

          {/* RECIPE CARDS GRID */}
          {isLoading ? (
            <div className="py-12 text-center text-xs text-[#717A73]">
              Searching authentic regional formulations...
            </div>
          ) : recipes.length === 0 ? (
            <Card variant="default" className="py-12 text-center space-y-3">
              <Compass size={32} className="mx-auto text-[#717A73]" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-[#1C1F1D]">No regional matches found</h3>
                <p className="text-xs text-[#575E59]">
                  Try clearing your search query or switching regions/categories.
                </p>
              </div>
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedRegion("All Regions");
                  setSelectedCategory("All Categories");
                  setVerificationFilter("all");
                }}
                size="sm"
                variant="outline"
              >
                Reset Filters
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map((rec) => (
                <Card
                  key={rec.id}
                  variant="default"
                  className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow group border-[#E8E5DD]"
                >
                  <div className="space-y-3">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-[#437151] bg-[#E2ECE4] border border-[#C7DBD0] rounded px-1.5 py-0.5">
                          {rec.region}
                        </span>
                        {rec.locality && (
                          <span className="text-[10px] text-[#575E59] bg-[#FAF8F5] border border-[#E8E5DD] rounded px-1.5 py-0.5">
                            {rec.locality}
                          </span>
                        )}
                      </div>

                      {rec.verification_status === "verified" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#263B2C]">
                          <ShieldCheck size={12} className="text-[#375A41]" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#6B7546]">
                          <Sparkles size={11} />
                          <span>Estimated</span>
                        </span>
                      )}
                    </div>

                    {/* Dish Title & Local Name */}
                    <div>
                      <h3 className="text-base font-bold text-[#1C1F1D] group-hover:text-[#437151] transition-colors">
                        {rec.name}
                      </h3>
                      {rec.local_name && (
                        <p className="text-xs font-medium text-[#6B7546] mt-0.5">
                          {rec.local_name}
                        </p>
                      )}
                    </div>

                    {/* Short Description */}
                    <p className="text-xs text-[#575E59] line-clamp-2 leading-relaxed">
                      {rec.description}
                    </p>

                    {/* Cooking & Serving Specs */}
                    <div className="flex items-center gap-3 text-[11px] text-[#717A73] pt-1">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {rec.preparation_time_minutes + rec.cooking_time_minutes}m
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {rec.default_servings} servings
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 truncate max-w-[120px]">
                        <Utensils size={12} />
                        {rec.cooking_method}
                      </span>
                    </div>

                    {/* Macros Highlight Box */}
                    <div className="rounded-xl bg-[#FAF8F5] p-2.5 border border-[#E8E5DD] grid grid-cols-4 gap-1 text-center">
                      <div>
                        <p className="text-sm font-bold text-[#1C1F1D]">{rec.calories_per_serving}</p>
                        <p className="text-[9px] uppercase font-semibold text-[#717A73]">kcal</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#263B2C]">{rec.protein_per_serving}g</p>
                        <p className="text-[9px] uppercase font-semibold text-[#375A41]">Protein</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#43492D]">{rec.carbohydrates_per_serving}g</p>
                        <p className="text-[9px] uppercase font-semibold text-[#6B7546]">Carbs</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1C1F1D]">{rec.fat_per_serving}g</p>
                        <p className="text-[9px] uppercase font-semibold text-[#717A73]">Fat</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="pt-4 border-t border-[#E8E5DD] flex items-center gap-2 mt-4">
                    <Button
                      type="button"
                      onClick={() => openRecipeDetail(rec)}
                      size="sm"
                      variant="primary"
                      className="w-full text-xs"
                    >
                      View Recipe & Nutrition
                    </Button>
                    <Link
                      href={`/app/regional/${rec.id}`}
                      className="p-2 rounded-lg border border-[#E8E5DD] hover:bg-[#FAF8F5] text-[#575E59] hover:text-[#1C1F1D] transition-colors"
                      title="Open dedicated page"
                    >
                      <BookOpen size={14} />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY RECIPE CONTRIBUTIONS */}
      {activeTab === "submissions" && (
        <Card variant="default" className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E5DD]">
            <div>
              <h2 className="text-base font-semibold text-[#1C1F1D]">
                My Community Submissions
              </h2>
              <p className="text-xs text-[#575E59]">
                Regional recipes submitted by you, held in queue for traditional culinary curation.
              </p>
            </div>
            <Button
              onClick={() => setIsContributionModalOpen(true)}
              size="sm"
              variant="primary"
              icon={<Plus size={14} />}
              iconPosition="left"
            >
              Submit Another Recipe
            </Button>
          </div>

          {userSubmissions.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#717A73] border border-dashed border-[#E8E5DD] rounded-xl bg-[#FAF8F5]/40 space-y-3">
              <BookOpen size={28} className="mx-auto text-[#717A73]" />
              <div className="space-y-1">
                <p className="font-semibold text-[#1C1F1D]">No recipes contributed yet</p>
                <p>Have an authentic heirloom family recipe from Bhatkal or Coastal Karnataka? Share it for review.</p>
              </div>
              <Button
                onClick={() => setIsContributionModalOpen(true)}
                size="sm"
                variant="secondary"
                className="mt-2 text-xs"
              >
                Contribute Your First Recipe
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-[#E8E5DD]">
              {userSubmissions.map((sub) => (
                <div key={sub.id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#1C1F1D]">
                        {sub.dish_name}
                      </h3>
                      {sub.local_name && (
                        <p className="text-xs text-[#6B7546]">{sub.local_name}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-[#8F5E16] bg-[#FDF6E2] border border-[#E8D49E] rounded px-2 py-0.5">
                      Pending Curator Verification
                    </span>
                  </div>

                  <p className="text-xs text-[#575E59] line-clamp-2">
                    {sub.cooking_instructions}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#717A73]">
                    <span>Region: <strong>{sub.region}</strong></span>
                    <span>•</span>
                    <span>Category: <strong>{sub.category}</strong></span>
                    <span>•</span>
                    <span>Servings: <strong>{sub.serving_count}</strong></span>
                    <span>•</span>
                    <span>Attribution: <em>{sub.source_attribution}</em></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* RECIPE DETAIL MODAL */}
      <RecipeDetailModal
        recipe={selectedRecipeForDetail}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedRecipeForDetail(null);
        }}
      />

      {/* RECIPE CONTRIBUTION MODAL */}
      <RecipeContributionModal
        isOpen={isContributionModalOpen}
        onClose={() => setIsContributionModalOpen(false)}
        onSubmitted={() => {
          if (activeTab === "submissions") {
            handleRefreshSubmissions();
          }
        }}
      />
    </PageContainer>
  );
}

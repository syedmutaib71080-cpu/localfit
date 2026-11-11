import * as React from "react";
import { AUTHENTIC_REGIONAL_RECIPES } from "@/lib/regional-food-data";
import { RecipeDetailClient } from "./recipe-detail-client";

export function generateStaticParams() {
  return AUTHENTIC_REGIONAL_RECIPES.map((recipe) => ({
    id: recipe.id,
  }));
}

export default async function RegionalRecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <React.Suspense
      fallback={
        <div className="py-12 text-center text-xs text-[#717A73]">
          Loading authentic regional recipe...
        </div>
      }
    >
      <RecipeDetailClient id={id} />
    </React.Suspense>
  );
}

import * as React from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { IconNutrition } from "@/components/ui/icons";

export function NutritionView() {
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Nutritional Intelligence"
        title="Nutrition"
        description="Foundational structure for dietary balances, micronutrients, and intelligent nutritional insights."
        action={
          <Badge variant="neutral" size="md">
            Stage 1 Scaffold
          </Badge>
        }
      />

      <EmptyState
        variant="card"
        icon={<IconNutrition size={22} />}
        title="Nutritional Intelligence Ready"
        description="The nutrition module architecture is set up. AI-powered nutritional analysis will be introduced in future stages."
      />
    </div>
  );
}

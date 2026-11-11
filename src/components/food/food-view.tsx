import * as React from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { IconFood } from "@/components/ui/icons";

export function FoodView() {
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Food & Meals"
        title="Food Log"
        description="Foundational structure for tracking whole foods, macronutrients, and daily nourishment."
        action={
          <Badge variant="neutral" size="md">
            Stage 1 Scaffold
          </Badge>
        }
      />

      <EmptyState
        variant="card"
        icon={<IconFood size={22} />}
        title="No Food Entries Logged"
        description="Food tracking capabilities will be implemented in subsequent development stages. No mock or fake health data is loaded."
      />
    </div>
  );
}

import * as React from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { IconProgress } from "@/components/ui/icons";

export function ProgressView() {
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Trends & Trajectory"
        title="Progress"
        description="Foundational structure for tracking long-term trends, body composition, and wellness habits."
        action={
          <Badge variant="neutral" size="md">
            Stage 1 Scaffold
          </Badge>
        }
      />

      <EmptyState
        variant="card"
        icon={<IconProgress size={22} />}
        title="No Progress Trends Yet"
        description="Progress measurement views are structurally prepared. Visual charts and historical trends will connect in Stage 2."
      />
    </div>
  );
}

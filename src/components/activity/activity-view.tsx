import * as React from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { IconActivity } from "@/components/ui/icons";

export function ActivityView() {
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Daily Movement"
        title="Activity"
        description="Foundational structure for tracking physical activity, exercise routines, and movement sessions."
        action={
          <Badge variant="neutral" size="md">
            Stage 1 Scaffold
          </Badge>
        }
      />

      <EmptyState
        variant="card"
        icon={<IconActivity size={22} />}
        title="No Activity Sessions"
        description="Physical activity logging foundations are prepared. Real-time metric capture will connect in Stage 2."
      />
    </div>
  );
}

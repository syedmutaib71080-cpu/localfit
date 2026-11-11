import * as React from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconDashboard } from "@/components/ui/icons";

export function DashboardView() {
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Overview"
        title="Welcome to LocalFit"
        description="Your mindful health and fitness sanctuary. Foundational architecture and design tokens configured for Stage 1."
        action={
          <Badge variant="sage" size="md">
            Stage 1 Active
          </Badge>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="default">
          <CardHeader>
            <CardTitle>Architecture Ready</CardTitle>
            <CardDescription>
              Clean modular structure separating UI, layout, domain views, hooks, and types.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#575E59] leading-relaxed">
              Standardized Next.js App Router route groups established with zero hydration mismatches.
            </p>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardHeader>
            <CardTitle>Design Tokens</CardTitle>
            <CardDescription>
              Apple-inspired ivory palette with sage & olive natural accents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#575E59] leading-relaxed">
              Tailwind CSS v4 configured with warm cream backgrounds and charcoal contrast.
            </p>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardHeader>
            <CardTitle>Stage 2 Roadmap</CardTitle>
            <CardDescription>
              Data layer, authentication, and AI-assisted logging prepared for future stages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#575E59] leading-relaxed">
              Ready for Supabase and Gemini integrations when authorized.
            </p>
          </CardContent>
        </Card>
      </div>

      <EmptyState
        variant="card"
        icon={<IconDashboard size={22} />}
        title="Stage 1 Foundation Ready"
        description="The dashboard foundation is fully prepared. Actual telemetry and intelligence will be wired in Stage 2."
        action={
          <Button href="/food" variant="primary" size="sm">
            View Food Module Foundation
          </Button>
        }
        secondaryAction={
          <Button href="/nutrition" variant="outline" size="sm">
            View Nutrition Module
          </Button>
        }
      />
    </div>
  );
}

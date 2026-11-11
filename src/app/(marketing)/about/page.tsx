import * as React from "react";
import { PageContainer } from "@/components/ui/page-container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <PageContainer size="narrow" className="py-16 sm:py-24 space-y-12">
      <SectionHeading
        eyebrow="Philosophy"
        title="The LocalFit Principles"
        description="We believe health software should instill calm focus, not dopamine addiction or sensory fatigue."
      />

      <div className="space-y-6">
        <Card variant="default">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>1. Apple-Inspired Restraint</CardTitle>
              <Badge variant="sage" size="sm">Aesthetic</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[#575E59] leading-relaxed">
            <p>
              LocalFit is purposefully built with light mode only, warm cream and ivory backgrounds, dark charcoal text, and subtle sage accents. No aggressive red alerts or chaotic dark neon gamification.
            </p>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>2. Quality Architecture</CardTitle>
              <Badge variant="olive" size="sm">Engineering</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[#575E59] leading-relaxed">
            <p>
              Built strictly with Next.js App Router, React 19, TypeScript strict mode, and zero bloated libraries. Clean route groups cleanly separate marketing, auth foundations, and application views.
            </p>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>3. Stage 1 Integrity</CardTitle>
              <Badge variant="neutral" size="sm">Scope</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[#575E59] leading-relaxed">
            <p>
              No fake data, no simulated health telemetry, and no mock authentication. Everything created in Stage 1 serves as durable, production-grade foundation for upcoming stages.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="pt-4 flex justify-between items-center border-t border-[#E8E5DD]">
        <Button href="/" variant="outline" size="sm">
          ← Back to Overview
        </Button>
        <Button href="/app/dashboard" variant="primary" size="sm">
          Go to Dashboard
        </Button>
      </div>
    </PageContainer>
  );
}

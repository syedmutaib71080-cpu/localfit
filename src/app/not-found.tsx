import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] p-4 text-[#1C1F1D]">
      <PageContainer size="narrow" className="text-center space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7546]">
          404 Not Found
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Page does not exist
        </h1>
        <p className="text-sm text-[#575E59] max-w-sm mx-auto leading-relaxed">
          The requested page could not be located. It may have been moved or is not yet configured.
        </p>
        <div className="pt-4 flex justify-center gap-3">
          <Button href="/" variant="primary" size="md">
            Return Home
          </Button>
          <Button href="/app/dashboard" variant="outline" size="md">
            Go to Dashboard
          </Button>
        </div>
      </PageContainer>
    </div>
  );
}

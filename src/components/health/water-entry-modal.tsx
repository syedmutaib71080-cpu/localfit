"use client";

import * as React from "react";
import { X, Droplets, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTodayDateString, isValidDateString } from "@/lib/nutrition-client";
import type { CreateWaterLogInput, UpdateWaterLogInput, WaterLog } from "@/types/health-tracking";

interface WaterEntryModalProps {
  isOpen: boolean;
  initialEntry?: WaterLog | null;
  defaultDate?: string;
  onClose: () => void;
  onSubmit: (data: CreateWaterLogInput | UpdateWaterLogInput) => Promise<void>;
}

const PRESET_AMOUNTS = [
  { label: "Glass (250 ml)", amount: 250 },
  { label: "Mug (350 ml)", amount: 350 },
  { label: "Bottle (500 ml)", amount: 500 },
  { label: "Flask (750 ml)", amount: 750 },
  { label: "Large Bottle (1000 ml)", amount: 1000 },
];

function WaterEntryDialog({
  initialEntry,
  defaultDate,
  onClose,
  onSubmit,
}: {
  initialEntry?: WaterLog | null;
  defaultDate?: string;
  onClose: () => void;
  onSubmit: (data: CreateWaterLogInput | UpdateWaterLogInput) => Promise<void>;
}) {
  const isEditing = Boolean(initialEntry);

  const [amountMl, setAmountMl] = React.useState<string>(() =>
    initialEntry ? initialEntry.amount_ml.toString() : "250"
  );
  const [intakeDate, setIntakeDate] = React.useState<string>(() =>
    initialEntry ? initialEntry.intake_date : defaultDate || getTodayDateString()
  );
  const [notes, setNotes] = React.useState<string>(() =>
    initialEntry?.notes || ""
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const amountNum = parseInt(amountMl, 10);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setErrorMessage("Please enter a positive amount in milliliters.");
      return;
    }

    if (amountNum > 10000) {
      setErrorMessage("Water intake cannot exceed 10,000 ml (10 liters).");
      return;
    }

    if (!isValidDateString(intakeDate)) {
      setErrorMessage("Please provide a valid date in YYYY-MM-DD format.");
      return;
    }

    if (notes.trim().length > 500) {
      setErrorMessage("Notes cannot exceed 500 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        amount_ml: amountNum,
        intake_date: intakeDate,
        notes: notes.trim().length > 0 ? notes.trim() : null,
      });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save water log";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="water-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#E0F2FE] text-[#0369A1]">
              <Droplets size={18} />
            </div>
            <div>
              <h2 id="water-modal-title" className="text-base font-semibold text-[#1C1F1D]">
                {isEditing ? "Edit Water Intake" : "Log Water Intake"}
              </h2>
              <p className="text-xs text-[#575E59]">
                {isEditing ? "Update hydration amount" : "Record hydration volume in milliliters"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-[#717A73] hover:text-[#1C1F1D] hover:bg-[#FAF8F5] transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-[#FCA5A5] bg-[#FEE2E2] p-3 text-xs font-semibold text-[#B91C1C]">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Preset Buttons */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1F1D]">Quick Select Portion</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset.amount}
                  type="button"
                  onClick={() => setAmountMl(preset.amount.toString())}
                  disabled={isSubmitting}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    amountMl === preset.amount.toString()
                      ? "border-[#0369A1] bg-[#E0F2FE] text-[#0369A1] font-semibold"
                      : "border-[#E8E5DD] bg-[#FAF8F5] text-[#575E59] hover:text-[#1C1F1D]"
                  }`}
                >
                  {preset.amount} ml
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1F1D]">Amount (ml) *</label>
            <input
              type="number"
              step="1"
              min="1"
              max="10000"
              placeholder="e.g. 500"
              value={amountMl}
              onChange={(e) => setAmountMl(e.target.value)}
              disabled={isSubmitting}
              required
              className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#0369A1]"
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1F1D]">Date Logged *</label>
            <input
              type="date"
              value={intakeDate}
              onChange={(e) => setIntakeDate(e.target.value)}
              disabled={isSubmitting}
              required
              className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#0369A1]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1F1D]">Notes (Optional)</label>
            <input
              type="text"
              maxLength={500}
              placeholder="e.g. Lemon water, electrolytes, herbal tea..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#0369A1]"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E8E5DD]">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </span>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Record Water"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function WaterEntryModal({
  isOpen,
  initialEntry,
  defaultDate,
  onClose,
  onSubmit,
}: WaterEntryModalProps) {
  if (!isOpen) return null;

  return (
    <WaterEntryDialog
      key={initialEntry ? initialEntry.id : `new-water-${defaultDate || "today"}`}
      initialEntry={initialEntry}
      defaultDate={defaultDate}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

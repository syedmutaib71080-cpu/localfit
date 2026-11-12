"use client";

import * as React from "react";
import { X, Scale, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTodayDateString, isValidDateString } from "@/lib/nutrition-client";
import type { CreateWeightLogInput, UpdateWeightLogInput, WeightLog } from "@/types/health-tracking";

interface WeightEntryModalProps {
  isOpen: boolean;
  initialEntry?: WeightLog | null;
  onClose: () => void;
  onSubmit: (data: CreateWeightLogInput | UpdateWeightLogInput) => Promise<void>;
}

function WeightEntryDialog({
  initialEntry,
  onClose,
  onSubmit,
}: {
  initialEntry?: WeightLog | null;
  onClose: () => void;
  onSubmit: (data: CreateWeightLogInput | UpdateWeightLogInput) => Promise<void>;
}) {
  const isEditing = Boolean(initialEntry);

  const [weightKg, setWeightKg] = React.useState<string>(() =>
    initialEntry ? initialEntry.weight_kg.toString() : ""
  );
  const [loggedDate, setLoggedDate] = React.useState<string>(() =>
    initialEntry ? initialEntry.logged_date : getTodayDateString()
  );
  const [notes, setNotes] = React.useState<string>(() =>
    initialEntry?.notes || ""
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const weightNum = parseFloat(weightKg);
    if (!Number.isFinite(weightNum) || weightNum <= 0) {
      setErrorMessage("Please enter a valid weight in kilograms.");
      return;
    }

    if (weightNum < 20.0 || weightNum > 400.0) {
      setErrorMessage("Weight must be between 20.0 and 400.0 kg.");
      return;
    }

    if (!isValidDateString(loggedDate)) {
      setErrorMessage("Please provide a valid date in YYYY-MM-DD format.");
      return;
    }

    if (notes.trim().length > 1000) {
      setErrorMessage("Notes cannot exceed 1000 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        weight_kg: Math.round(weightNum * 10) / 10,
        logged_date: loggedDate,
        notes: notes.trim().length > 0 ? notes.trim() : null,
      });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save weight record";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="weight-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#E2ECE4] text-[#375A41]">
              <Scale size={18} />
            </div>
            <div>
              <h2 id="weight-modal-title" className="text-base font-semibold text-[#1C1F1D]">
                {isEditing ? "Edit Weight Entry" : "Log Weigh-In"}
              </h2>
              <p className="text-xs text-[#575E59]">
                {isEditing ? "Update recorded weigh-in value" : "Record your morning weight"}
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
          {/* Weight in kg */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1F1D]">Weight (kg) *</label>
            <input
              type="number"
              step="0.1"
              min="20.0"
              max="400.0"
              placeholder="e.g. 74.5"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              disabled={isSubmitting}
              required
              className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151]"
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1F1D]">Date Logged *</label>
            <input
              type="date"
              value={loggedDate}
              onChange={(e) => setLoggedDate(e.target.value)}
              disabled={isSubmitting}
              required
              className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1F1D]">Notes (Optional)</label>
            <textarea
              rows={2}
              maxLength={1000}
              placeholder="e.g. Fasted morning weigh-in, post-run..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151] resize-none"
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
                "Record Weight"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function WeightEntryModal({
  isOpen,
  initialEntry,
  onClose,
  onSubmit,
}: WeightEntryModalProps) {
  if (!isOpen) return null;

  return (
    <WeightEntryDialog
      key={initialEntry ? initialEntry.id : "new-weight"}
      initialEntry={initialEntry}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

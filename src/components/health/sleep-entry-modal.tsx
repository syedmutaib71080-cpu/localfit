"use client";

import * as React from "react";
import { X, Moon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTodayDateString, isValidDateString } from "@/lib/nutrition-client";
import { calculateSleepDurationFromTimestamps } from "@/lib/health-calculator";
import type {
  CreateSleepLogInput,
  SleepLog,
  SleepQuality,
  UpdateSleepLogInput,
} from "@/types/health-tracking";

interface SleepEntryModalProps {
  isOpen: boolean;
  initialEntry?: SleepLog | null;
  defaultDate?: string;
  onClose: () => void;
  onSubmit: (data: CreateSleepLogInput | UpdateSleepLogInput) => Promise<void>;
}

const SLEEP_QUALITIES: { id: SleepQuality; label: string; desc: string }[] = [
  { id: "poor", label: "Poor", desc: "Restless or broken" },
  { id: "fair", label: "Fair", desc: "Somewhat refreshed" },
  { id: "good", label: "Good", desc: "Sound & restorative" },
  { id: "excellent", label: "Excellent", desc: "Deep & energizing" },
];

function SleepEntryDialog({
  initialEntry,
  defaultDate,
  onClose,
  onSubmit,
}: {
  initialEntry?: SleepLog | null;
  defaultDate?: string;
  onClose: () => void;
  onSubmit: (data: CreateSleepLogInput | UpdateSleepLogInput) => Promise<void>;
}) {
  const isEditing = Boolean(initialEntry);

  const [sleepDate, setSleepDate] = React.useState<string>(() =>
    initialEntry ? initialEntry.sleep_date : defaultDate || getTodayDateString()
  );
  const [durationMinutes, setDurationMinutes] = React.useState<string>(() =>
    initialEntry ? initialEntry.duration_minutes.toString() : "480"
  );
  const [bedtime, setBedtime] = React.useState<string>(() =>
    initialEntry?.bedtime
      ? new Date(initialEntry.bedtime).toISOString().slice(0, 16)
      : ""
  );
  const [wakeTime, setWakeTime] = React.useState<string>(() =>
    initialEntry?.wake_time
      ? new Date(initialEntry.wake_time).toISOString().slice(0, 16)
      : ""
  );
  const [quality, setQuality] = React.useState<SleepQuality | "">(() =>
    initialEntry?.sleep_quality || "good"
  );
  const [notes, setNotes] = React.useState<string>(() =>
    initialEntry?.notes || ""
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Auto-calculate duration when both bedtime and wakeTime change
  const handleBedtimeChange = (val: string) => {
    setBedtime(val);
    if (val && wakeTime) {
      const calculated = calculateSleepDurationFromTimestamps(val, wakeTime);
      if (calculated && calculated >= 30 && calculated <= 1440) {
        setDurationMinutes(calculated.toString());
      }
    }
  };

  const handleWakeTimeChange = (val: string) => {
    setWakeTime(val);
    if (bedtime && val) {
      const calculated = calculateSleepDurationFromTimestamps(bedtime, val);
      if (calculated && calculated >= 30 && calculated <= 1440) {
        setDurationMinutes(calculated.toString());
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const dur = parseInt(durationMinutes, 10);
    if (!Number.isFinite(dur) || dur < 30 || dur > 1440) {
      setErrorMessage("Sleep duration must be between 30 and 1440 minutes (24 hours).");
      return;
    }

    if (!isValidDateString(sleepDate)) {
      setErrorMessage("Please enter a valid date in YYYY-MM-DD format.");
      return;
    }

    if (bedtime && wakeTime) {
      const bedMs = new Date(bedtime).getTime();
      const wakeMs = new Date(wakeTime).getTime();
      if (wakeMs <= bedMs) {
        setErrorMessage("Wake time must be strictly later than bedtime.");
        return;
      }
      const elapsed = Math.round((wakeMs - bedMs) / 60000);
      if (dur > elapsed + 2) {
        setErrorMessage(
          `Sleep duration (${dur}m) cannot exceed time between bedtime and wake time (${elapsed}m).`
        );
        return;
      }
    }

    if (notes.trim().length > 1000) {
      setErrorMessage("Notes cannot exceed 1000 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        sleep_date: sleepDate,
        duration_minutes: dur,
        bedtime: bedtime ? new Date(bedtime).toISOString() : null,
        wake_time: wakeTime ? new Date(wakeTime).toISOString() : null,
        sleep_quality: (quality as SleepQuality) || null,
        notes: notes.trim().length > 0 ? notes.trim() : null,
      });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save sleep log";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sleep-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#EDE9FE] text-[#6D28D9]">
              <Moon size={18} />
            </div>
            <div>
              <h2 id="sleep-modal-title" className="text-base font-semibold text-[#1C1F1D]">
                {isEditing ? "Edit Sleep Entry" : "Log Sleep Duration"}
              </h2>
              <p className="text-xs text-[#575E59]">
                {isEditing ? "Update recorded rest" : "Record nightly rest and sleep quality"}
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
          {/* Sleep Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1F1D]">Sleep Date (Waking Date) *</label>
            <input
              type="date"
              value={sleepDate}
              onChange={(e) => setSleepDate(e.target.value)}
              disabled={isSubmitting}
              required
              className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
            />
          </div>

          {/* Duration in Minutes with Quick Preview */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-[#1C1F1D]">Duration (Minutes) *</label>
              {parseInt(durationMinutes, 10) > 0 && (
                <span className="text-xs text-[#6D28D9] font-medium">
                  {Math.floor(parseInt(durationMinutes, 10) / 60)}h{" "}
                  {parseInt(durationMinutes, 10) % 60}m
                </span>
              )}
            </div>
            <input
              type="number"
              step="1"
              min="30"
              max="1440"
              placeholder="e.g. 480"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              disabled={isSubmitting}
              required
              className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
            />
          </div>

          {/* Optional Bedtime and Wake Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#717A73]">Bedtime (Optional)</label>
              <input
                type="datetime-local"
                value={bedtime}
                onChange={(e) => handleBedtimeChange(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-2.5 py-1.5 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#717A73]">Wake Time (Optional)</label>
              <input
                type="datetime-local"
                value={wakeTime}
                onChange={(e) => handleWakeTimeChange(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-2.5 py-1.5 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              />
            </div>
          </div>

          {/* Sleep Quality Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-[#1C1F1D]">Sleep Quality</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SLEEP_QUALITIES.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setQuality(q.id)}
                  disabled={isSubmitting}
                  className={`p-2 rounded-xl text-center border transition-all ${
                    quality === q.id
                      ? "border-[#6D28D9] bg-[#EDE9FE] text-[#6D28D9] font-bold shadow-sm"
                      : "border-[#E8E5DD] bg-[#FAF8F5] text-[#575E59] hover:text-[#1C1F1D]"
                  }`}
                >
                  <div className="text-xs">{q.label}</div>
                  <div className="text-[10px] text-[#717A73] leading-tight pt-0.5">{q.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1F1D]">Notes (Optional)</label>
            <input
              type="text"
              maxLength={1000}
              placeholder="e.g. Slept through the night, had chamomile tea..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
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
                "Record Sleep"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SleepEntryModal({
  isOpen,
  initialEntry,
  defaultDate,
  onClose,
  onSubmit,
}: SleepEntryModalProps) {
  if (!isOpen) return null;

  return (
    <SleepEntryDialog
      key={initialEntry ? initialEntry.id : `new-sleep-${defaultDate || "today"}`}
      initialEntry={initialEntry}
      defaultDate={defaultDate}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

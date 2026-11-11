"use client";

import * as React from "react";
import { X, Footprints, Plus, Trash2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DailyStepEntry, CreateStepInput, UpdateStepInput } from "@/types/activity";

interface StepEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialDate?: string;
  editingEntry?: DailyStepEntry | null;
  existingEntriesForDay?: DailyStepEntry[];
  onAddStep: (input: CreateStepInput) => Promise<{ success: boolean; error?: string }>;
  onUpdateStep: (id: string, input: UpdateStepInput) => Promise<{ success: boolean; error?: string }>;
  onDeleteStep: (id: string) => Promise<boolean>;
}

interface FormInnerProps {
  onClose: () => void;
  onSaved: () => void;
  initialDate?: string;
  editingEntry?: DailyStepEntry | null;
  existingEntriesForDay?: DailyStepEntry[];
  onAddStep: (input: CreateStepInput) => Promise<{ success: boolean; error?: string }>;
  onUpdateStep: (id: string, input: UpdateStepInput) => Promise<{ success: boolean; error?: string }>;
  onDeleteStep: (id: string) => Promise<boolean>;
}

function StepEntryForm({
  onClose,
  onSaved,
  initialDate,
  editingEntry,
  existingEntriesForDay = [],
  onAddStep,
  onUpdateStep,
  onDeleteStep,
}: FormInnerProps) {
  const [stepsInput, setStepsInput] = React.useState<string>(
    editingEntry ? editingEntry.steps.toString() : ""
  );
  const [dateInput, setDateInput] = React.useState<string>(
    editingEntry ? editingEntry.step_date : initialDate || "2026-11-11"
  );
  const [notesInput, setNotesInput] = React.useState<string>(
    editingEntry?.notes || ""
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const steps = parseInt(stepsInput, 10);
    if (isNaN(steps) || steps <= 0) {
      setErrorMessage("Please enter a valid step count greater than 0.");
      return;
    }
    if (steps > 150000) {
      setErrorMessage("Step count exceeds reasonable daily physical limit (150,000 steps).");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingEntry) {
        const res = await onUpdateStep(editingEntry.id, {
          steps,
          notes: notesInput.trim() || null,
        });
        if (!res.success) {
          setErrorMessage(res.error || "Failed to update step entry");
          setIsSubmitting(false);
          return;
        }
      } else {
        const res = await onAddStep({
          step_date: dateInput,
          steps,
          source: "manual",
          notes: notesInput.trim() || null,
        });
        if (!res.success) {
          setErrorMessage(res.error || "Failed to log steps");
          setIsSubmitting(false);
          return;
        }
      }

      onSaved();
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEntry) return;
    setIsSubmitting(true);
    try {
      const ok = await onDeleteStep(editingEntry.id);
      if (ok) {
        onSaved();
        onClose();
      } else {
        setErrorMessage("Failed to delete step entry.");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const dayTotalSteps = existingEntriesForDay.reduce((acc, curr) => acc + curr.steps, 0);

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E8E5DD] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E5DD] bg-[#FAF8F5]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#E2ECE4] text-[#375A41]">
            <Footprints size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#1C1F1D]">
              {editingEntry ? "Edit Step Log" : "Log Daily Steps"}
            </h2>
            <p className="text-xs text-[#575E59]">
              {editingEntry ? "Update or delete this record" : "Add steps to today's cumulative total"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-[#717A73] hover:text-[#1C1F1D] hover:bg-[#EFEBE1] transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Existing Day Overview */}
      {!editingEntry && existingEntriesForDay.length > 0 && (
        <div className="px-6 py-3 bg-[#F5EFEB] border-b border-[#E8E5DD] flex items-center justify-between text-xs">
          <span className="text-[#575E59]">Currently logged for {dateInput}:</span>
          <span className="font-bold text-[#375A41]">{dayTotalSteps.toLocaleString()} steps</span>
        </div>
      )}

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Steps Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#1C1F1D] flex items-center justify-between">
            <span>Steps Count *</span>
            <span className="text-[11px] font-normal text-[#717A73]">e.g. 3,500</span>
          </label>
          <input
            type="number"
            min="1"
            max="150000"
            step="1"
            required
            value={stepsInput}
            onChange={(e) => setStepsInput(e.target.value)}
            placeholder="Enter number of steps"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] text-sm text-[#1C1F1D] placeholder-[#A0A8A2] focus:outline-hidden focus:ring-2 focus:ring-[#437151] focus:bg-white transition-all"
          />
        </div>

        {/* Date Input */}
        {!editingEntry && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1F1D]">Date *</label>
            <input
              type="date"
              required
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] text-sm text-[#1C1F1D] focus:outline-hidden focus:ring-2 focus:ring-[#437151] focus:bg-white transition-all"
            />
          </div>
        )}

        {/* Notes Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#1C1F1D] flex items-center justify-between">
            <span>Activity Note (Optional)</span>
            <span className="text-[11px] font-normal text-[#717A73]">e.g. Beach walk</span>
          </label>
          <input
            type="text"
            maxLength={120}
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            placeholder="e.g. Morning stroll, market errands"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] text-sm text-[#1C1F1D] placeholder-[#A0A8A2] focus:outline-hidden focus:ring-2 focus:ring-[#437151] focus:bg-white transition-all"
          />
        </div>

        <div className="pt-2 flex items-center justify-between gap-3">
          {editingEntry ? (
            isConfirmingDelete ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDelete}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-3 py-2 text-xs rounded-xl border border-[#E8E5DD] text-[#575E59]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            )
          ) : (
            <span className="text-[11px] text-[#717A73]">
              Adds to today&apos;s cumulative sum
            </span>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              icon={editingEntry ? <Check size={14} /> : <Plus size={14} />}
              iconPosition="left"
            >
              {isSubmitting ? "Saving..." : editingEntry ? "Save Changes" : "Log Steps"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export function StepEntryModal(props: StepEntryModalProps) {
  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <StepEntryForm
        key={props.editingEntry ? props.editingEntry.id : "new"}
        {...props}
      />
    </div>
  );
}

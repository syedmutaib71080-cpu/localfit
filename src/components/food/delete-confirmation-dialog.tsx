"use client";

import * as React from "react";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  foodName: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmationDialog({
  isOpen,
  foodName,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-2xl space-y-4 my-8 animate-in fade-in-50 zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FEE2E2] text-[#B91C1C]">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 id="delete-dialog-title" className="text-base font-semibold text-[#1C1F1D]">
                Delete Food Entry
              </h3>
              <p className="text-xs text-[#575E59]">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="text-[#717A73] hover:text-[#1C1F1D] p-1 rounded-lg disabled:opacity-50"
            aria-label="Close delete confirmation"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-[#575E59]">
          Are you sure you want to remove <strong className="text-[#1C1F1D]">&quot;{foodName}&quot;</strong> from your daily food log?
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8E5DD]">
          <Button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            variant="outline"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            variant="outline"
            size="sm"
            icon={<Trash2 size={14} />}
            iconPosition="left"
            className="border-[#FCA5A5] bg-[#FEE2E2] text-[#B91C1C] hover:bg-[#FCDCDC]"
          >
            {isDeleting ? "Deleting..." : "Delete Entry"}
          </Button>
        </div>
      </div>
    </div>
  );
}

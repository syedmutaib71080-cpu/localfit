"use client";

import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteHealthDialogProps {
  isOpen: boolean;
  itemType: "weight" | "water" | "sleep";
  itemDescription: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function DeleteHealthInnerDialog({
  itemType,
  itemDescription,
  onClose,
  onConfirm,
}: {
  itemType: "weight" | "water" | "sleep";
  itemDescription: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleConfirm = async () => {
    setErrorMessage(null);
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete entry";
      setErrorMessage(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-[#FEE2E2] text-[#B91C1C]">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 id="delete-dialog-title" className="text-base font-semibold text-[#1C1F1D]">
              Delete {itemType === "weight" ? "Weight Entry" : itemType === "water" ? "Water Log" : "Sleep Log"}?
            </h2>
            <p className="text-xs text-[#575E59]">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-xs text-[#575E59] leading-relaxed">
          Are you sure you want to permanently remove this {itemType} record (
          <span className="font-semibold text-[#1C1F1D]">{itemDescription}</span>)?
        </p>

        {errorMessage && (
          <div className="rounded-xl border border-[#FCA5A5] bg-[#FEE2E2] p-2.5 text-xs font-semibold text-[#B91C1C]">
            {errorMessage}
          </div>
        )}

        <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E8E5DD]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-[#B91C1C] hover:bg-[#991B1B] text-white border-transparent"
          >
            {isDeleting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" />
                Deleting...
              </span>
            ) : (
              "Delete Entry"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DeleteHealthDialog({
  isOpen,
  itemType,
  itemDescription,
  onClose,
  onConfirm,
}: DeleteHealthDialogProps) {
  if (!isOpen) return null;

  return (
    <DeleteHealthInnerDialog
      itemType={itemType}
      itemDescription={itemDescription}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

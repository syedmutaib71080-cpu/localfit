"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getTodayDateString,
  shiftDateString,
  formatDisplayDate,
  isValidDateString,
} from "@/lib/nutrition-client";

interface DashboardDateBarProps {
  selectedDate: string;
  onDateChange: (newDate: string) => void;
  disabled?: boolean;
}

export function DashboardDateBar({
  selectedDate,
  onDateChange,
  disabled = false,
}: DashboardDateBarProps) {
  const today = getTodayDateString();
  const isToday = selectedDate === today;

  const handlePrevDay = () => {
    const prev = shiftDateString(selectedDate, -1);
    onDateChange(prev);
  };

  const handleNextDay = () => {
    const next = shiftDateString(selectedDate, 1);
    onDateChange(next);
  };

  const handleJumpToday = () => {
    onDateChange(today);
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (isValidDateString(val)) {
      onDateChange(val);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Date Stepper and Picker */}
      <div className="flex items-center rounded-xl border border-[#E8E5DD] bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={handlePrevDay}
          disabled={disabled}
          className="p-1.5 rounded-lg text-[#575E59] hover:text-[#1C1F1D] hover:bg-[#FAF8F5] disabled:opacity-50 transition-colors cursor-pointer"
          title="Previous day"
          aria-label="Previous day"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#1C1F1D] relative">
          <Calendar size={13} className="text-[#437151] shrink-0" />
          <span className="hidden sm:inline">{formatDisplayDate(selectedDate)}</span>
          <span className="sm:hidden">{selectedDate}</span>
          {isToday && (
            <span className="text-[10px] text-[#375A41] bg-[#E2ECE4] border border-[#C7DBD0] rounded px-1.5 py-0.2 ml-1">
              Today
            </span>
          )}

          {/* Native HTML5 date picker for selecting arbitrary calendar dates */}
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateInputChange}
            disabled={disabled}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            aria-label="Select specific date"
            title="Click to open calendar picker"
          />
        </div>

        <button
          type="button"
          onClick={handleNextDay}
          disabled={disabled}
          className="p-1.5 rounded-lg text-[#575E59] hover:text-[#1C1F1D] hover:bg-[#FAF8F5] disabled:opacity-50 transition-colors cursor-pointer"
          title="Next day"
          aria-label="Next day"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Action shortcuts */}
      <div className="flex items-center gap-2">
        {!isToday && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleJumpToday}
            disabled={disabled}
            className="text-xs h-8 px-2.5"
            icon={<RotateCcw size={12} />}
            iconPosition="left"
          >
            Jump to Today
          </Button>
        )}
      </div>
    </div>
  );
}

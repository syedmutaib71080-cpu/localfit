"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getTodayDateString,
  shiftDateString,
  formatDisplayDate,
  isValidDateString,
} from "@/lib/nutrition-client";

interface HealthDateSelectorProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  disabled?: boolean;
}

export function HealthDateSelector({
  selectedDate,
  onSelectDate,
  disabled = false,
}: HealthDateSelectorProps) {
  const today = getTodayDateString();
  const isToday = selectedDate === today;

  const handlePrevDay = () => {
    onSelectDate(shiftDateString(selectedDate, -1));
  };

  const handleNextDay = () => {
    onSelectDate(shiftDateString(selectedDate, 1));
  };

  const handleGoToday = () => {
    onSelectDate(today);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (isValidDateString(val)) {
      onSelectDate(val);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border border-[#E8E5DD] bg-white shadow-sm">
      {/* Date Navigation Controls */}
      <div className="flex items-center gap-1.5 justify-between sm:justify-start">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePrevDay}
          disabled={disabled}
          aria-label="Previous day"
          className="h-8 w-8 p-0"
        >
          <ChevronLeft size={16} />
        </Button>

        <div className="flex items-center gap-2 px-2">
          <CalendarIcon size={14} className="text-[#437151]" />
          <span className="text-xs sm:text-sm font-semibold text-[#1C1F1D]">
            {formatDisplayDate(selectedDate)}
          </span>
          {isToday && (
            <span className="inline-flex items-center rounded-full bg-[#E2ECE4] px-2 py-0.5 text-[10px] font-bold text-[#263B2C]">
              Today
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleNextDay}
          disabled={disabled}
          aria-label="Next day"
          className="h-8 w-8 p-0"
        >
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* Date Picker Input & Quick Return to Today */}
      <div className="flex items-center gap-2 justify-end">
        {!isToday && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleGoToday}
            disabled={disabled}
            className="text-xs text-[#437151] hover:text-[#375A41] h-8 px-2.5"
          >
            <RotateCcw size={12} className="mr-1" />
            Jump to Today
          </Button>
        )}

        <label className="relative inline-flex items-center">
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            disabled={disabled}
            aria-label="Select custom date"
            className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-2.5 py-1 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151] cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
}

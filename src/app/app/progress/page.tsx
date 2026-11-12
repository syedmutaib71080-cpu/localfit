"use client";

import * as React from "react";
import {
  TrendingUp,
  Scale,
  Droplets,
  Moon,
  Target,
  LogIn,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  HealthDateSelector,
  BmiScreeningCard,
  WeightTrendChart,
  WeightTrackerCard,
  WeightEntryModal,
  WaterTrackerCard,
  WaterEntryModal,
  SleepTrackerCard,
  SleepEntryModal,
  HealthGoalsModal,
  DeleteHealthDialog,
} from "@/components/health";
import {
  createSleepLog,
  createWaterLog,
  createWeightLog,
  deleteSleepLog,
  deleteWaterLog,
  deleteWeightLog,
  fetchHealthGoals,
  fetchSleepLogs,
  fetchUserBiometrics,
  fetchWaterLogs,
  fetchWeightLogs,
  updateHealthGoals,
  updateSleepLog,
  updateWaterLog,
  updateWeightLog,
  type UserBiometrics,
} from "@/lib/health-client";
import { getTodayDateString } from "@/lib/nutrition-client";
import type {
  CreateSleepLogInput,
  CreateWaterLogInput,
  CreateWeightLogInput,
  SleepLog,
  SleepSummary,
  UpdateHealthGoalsInput,
  UpdateSleepLogInput,
  UpdateWaterLogInput,
  UpdateWeightLogInput,
  WaterIntakeSummary,
  WaterLog,
  WeightChangeResult,
  WeightLog,
} from "@/types/health-tracking";

export default function ProgressPage() {
  const [selectedDate, setSelectedDate] = React.useState<string>(getTodayDateString);
  const [isUnauthorized, setIsUnauthorized] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // User Profile Biometrics (height_cm, full_name, etc.)
  const [biometrics, setBiometrics] = React.useState<UserBiometrics | null>(null);

  // Health Goals
  const [waterGoal, setWaterGoal] = React.useState<number | null>(null);
  const [sleepGoal, setSleepGoal] = React.useState<number | null>(null);
  const [calorieGoal, setCalorieGoal] = React.useState<number | null>(null);
  const [proteinGoal, setProteinGoal] = React.useState<number | null>(null);

  // Weight state
  const [weights, setWeights] = React.useState<WeightLog[]>([]);
  const [weightChange, setWeightChange] = React.useState<WeightChangeResult | null>(null);

  // Water state
  const [waterLogs, setWaterLogs] = React.useState<WaterLog[]>([]);
  const [waterSummary, setWaterSummary] = React.useState<WaterIntakeSummary | null>(null);

  // Sleep state
  const [sleepLogs, setSleepLogs] = React.useState<SleepLog[]>([]);
  const [sleepSummary, setSleepSummary] = React.useState<SleepSummary | null>(null);

  // Modal open states
  const [weightModalOpen, setWeightModalOpen] = React.useState(false);
  const [editingWeight, setEditingWeight] = React.useState<WeightLog | null>(null);

  const [waterModalOpen, setWaterModalOpen] = React.useState(false);
  const [editingWater, setEditingWater] = React.useState<WaterLog | null>(null);

  const [sleepModalOpen, setSleepModalOpen] = React.useState(false);
  const [editingSleep, setEditingSleep] = React.useState<SleepLog | null>(null);

  const [goalsModalOpen, setGoalsModalOpen] = React.useState(false);

  // Delete dialog state
  const [deleteDialogState, setDeleteDialogState] = React.useState<{
    isOpen: boolean;
    itemType: "weight" | "water" | "sleep";
    itemDescription: string;
    targetId: string;
  }>({
    isOpen: false,
    itemType: "weight",
    itemDescription: "",
    targetId: "",
  });

  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // ----------------------------------------------------------------------------
  // Data Fetching
  // ----------------------------------------------------------------------------
  const [reloadKey, setReloadKey] = React.useState(0);

  const handleRetry = () => {
    setIsLoading(true);
    setErrorMessage(null);
    setReloadKey((k) => k + 1);
  };

  React.useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        const bio = await fetchUserBiometrics();
        if (!isMounted) return;

        if (!bio) {
          setIsUnauthorized(true);
          setIsLoading(false);
          return;
        }
        setBiometrics(bio);

        // Load goals, weights, water, sleep in parallel
        const [goalsData, weightsData, waterData, sleepData] = await Promise.all([
          fetchHealthGoals().catch(() => ({
            daily_water_goal_ml: bio.dailyWaterGoalMl,
            daily_sleep_goal_minutes: bio.dailySleepGoalMinutes,
            daily_calorie_goal: bio.dailyCalorieGoal,
            daily_protein_goal: bio.dailyProteinGoal,
          })),
          fetchWeightLogs().catch(() => ({ weights: [], count: 0, latestWeight: null, weightChange: null })),
          fetchWaterLogs({ date: selectedDate }).catch(() => ({ logs: [], count: 0, summary: undefined })),
          fetchSleepLogs({ date: selectedDate }).catch(() => ({ logs: [], count: 0, summary: undefined })),
        ]);

        if (!isMounted) return;

        setWaterGoal(goalsData.daily_water_goal_ml ?? bio.dailyWaterGoalMl ?? null);
        setSleepGoal(goalsData.daily_sleep_goal_minutes ?? bio.dailySleepGoalMinutes ?? null);
        setCalorieGoal(goalsData.daily_calorie_goal ?? bio.dailyCalorieGoal ?? null);
        setProteinGoal(goalsData.daily_protein_goal ?? bio.dailyProteinGoal ?? null);

        setWeights(weightsData.weights || []);
        setWeightChange(weightsData.weightChange || null);

        setWaterLogs(waterData.logs || []);
        setWaterSummary(waterData.summary || null);

        setSleepLogs(sleepData.logs || []);
        setSleepSummary(sleepData.summary || null);
      } catch (err) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Failed to load health metrics.";
        if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
          setIsUnauthorized(true);
        } else {
          setErrorMessage(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [selectedDate, reloadKey]);

  // Re-fetch only water & sleep when date changes
  const handleDateChange = async (newDate: string) => {
    setSelectedDate(newDate);
  };

  // ----------------------------------------------------------------------------
  // Weight Handlers
  // ----------------------------------------------------------------------------
  const handleSaveWeight = async (data: CreateWeightLogInput | UpdateWeightLogInput) => {
    if (editingWeight) {
      const updated = await updateWeightLog(editingWeight.id, data as UpdateWeightLogInput);
      setWeights((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      notifySuccess(`Updated weight record for ${updated.logged_date} (${updated.weight_kg} kg)`);
    } else {
      const created = await createWeightLog(data as CreateWeightLogInput);
      setWeights((prev) => [created, ...prev]);
      notifySuccess(`Recorded weigh-in of ${created.weight_kg} kg for ${created.logged_date}`);
    }

    // Refresh weight logs to update change calculations
    try {
      const refreshed = await fetchWeightLogs();
      setWeights(refreshed.weights);
      setWeightChange(refreshed.weightChange);
    } catch {
      // Keep optimistic update
    }
  };

  const handleDeleteWeight = async (id: string) => {
    await deleteWeightLog(id);
    setWeights((prev) => prev.filter((w) => w.id !== id));
    notifySuccess("Weight entry deleted successfully.");

    try {
      const refreshed = await fetchWeightLogs();
      setWeights(refreshed.weights);
      setWeightChange(refreshed.weightChange);
    } catch {
      // Keep optimistic update
    }
  };

  // ----------------------------------------------------------------------------
  // Water Handlers
  // ----------------------------------------------------------------------------
  const handleSaveWater = async (data: CreateWaterLogInput | UpdateWaterLogInput) => {
    if (editingWater) {
      const updated = await updateWaterLog(editingWater.id, data as UpdateWaterLogInput);
      setWaterLogs((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      notifySuccess(`Updated hydration record (${updated.amount_ml} ml)`);
    } else {
      const created = await createWaterLog(data as CreateWaterLogInput);
      setWaterLogs((prev) => [created, ...prev]);
      notifySuccess(`Logged ${created.amount_ml} ml of water intake`);
    }

    // Refresh daily water summary
    try {
      const refreshed = await fetchWaterLogs({ date: selectedDate });
      setWaterLogs(refreshed.logs);
      setWaterSummary(refreshed.summary || null);
    } catch {
      // Keep optimistic update
    }
  };

  const handleQuickAddWater = async (amountMl: number) => {
    const created = await createWaterLog({
      amount_ml: amountMl,
      intake_date: selectedDate,
      notes: "Quick hydration add",
    });
    setWaterLogs((prev) => [created, ...prev]);
    notifySuccess(`Added ${amountMl} ml to today's hydration total`);

    try {
      const refreshed = await fetchWaterLogs({ date: selectedDate });
      setWaterLogs(refreshed.logs);
      setWaterSummary(refreshed.summary || null);
    } catch {
      // Keep optimistic update
    }
  };

  const handleDeleteWater = async (id: string) => {
    await deleteWaterLog(id);
    setWaterLogs((prev) => prev.filter((item) => item.id !== id));
    notifySuccess("Water intake entry deleted.");

    try {
      const refreshed = await fetchWaterLogs({ date: selectedDate });
      setWaterLogs(refreshed.logs);
      setWaterSummary(refreshed.summary || null);
    } catch {
      // Keep optimistic update
    }
  };

  // ----------------------------------------------------------------------------
  // Sleep Handlers
  // ----------------------------------------------------------------------------
  const handleSaveSleep = async (data: CreateSleepLogInput | UpdateSleepLogInput) => {
    if (editingSleep) {
      const updated = await updateSleepLog(editingSleep.id, data as UpdateSleepLogInput);
      setSleepLogs((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      notifySuccess(`Updated sleep record (${updated.duration_minutes} min)`);
    } else {
      const created = await createSleepLog(data as CreateSleepLogInput);
      setSleepLogs((prev) => [created, ...prev]);
      notifySuccess(`Logged sleep duration of ${created.duration_minutes} minutes`);
    }

    try {
      const refreshed = await fetchSleepLogs({ date: selectedDate });
      setSleepLogs(refreshed.logs);
      setSleepSummary(refreshed.summary || null);
    } catch {
      // Keep optimistic update
    }
  };

  const handleDeleteSleep = async (id: string) => {
    await deleteSleepLog(id);
    setSleepLogs((prev) => prev.filter((item) => item.id !== id));
    notifySuccess("Sleep entry deleted.");

    try {
      const refreshed = await fetchSleepLogs({ date: selectedDate });
      setSleepLogs(refreshed.logs);
      setSleepSummary(refreshed.summary || null);
    } catch {
      // Keep optimistic update
    }
  };

  // ----------------------------------------------------------------------------
  // Health Goals Handlers
  // ----------------------------------------------------------------------------
  const handleSaveGoals = async (input: UpdateHealthGoalsInput) => {
    const prevWater = waterGoal;
    const prevSleep = sleepGoal;

    try {
      const updated = await updateHealthGoals(input);
      setWaterGoal(updated.daily_water_goal_ml);
      setSleepGoal(updated.daily_sleep_goal_minutes);
      notifySuccess("Health goals updated successfully.");

      // Re-trigger summary recalculations
      const [waterData, sleepData] = await Promise.all([
        fetchWaterLogs({ date: selectedDate }),
        fetchSleepLogs({ date: selectedDate }),
      ]);
      setWaterSummary(waterData.summary || null);
      setSleepSummary(sleepData.summary || null);
    } catch (err) {
      // Rollback on failure
      setWaterGoal(prevWater);
      setSleepGoal(prevSleep);
      throw err;
    }
  };

  // ----------------------------------------------------------------------------
  // Confirmation Dialog Trigger
  // ----------------------------------------------------------------------------
  const openDeleteDialog = (
    type: "weight" | "water" | "sleep",
    desc: string,
    id: string
  ) => {
    setDeleteDialogState({
      isOpen: true,
      itemType: type,
      itemDescription: desc,
      targetId: id,
    });
  };

  const handleConfirmDelete = async () => {
    const { itemType, targetId } = deleteDialogState;
    if (itemType === "weight") {
      await handleDeleteWeight(targetId);
    } else if (itemType === "water") {
      await handleDeleteWater(targetId);
    } else if (itemType === "sleep") {
      await handleDeleteSleep(targetId);
    }
  };

  // ----------------------------------------------------------------------------
  // Render: Unauthenticated State
  // ----------------------------------------------------------------------------
  if (isUnauthorized) {
    return (
      <PageContainer size="wide" className="py-12">
        <Card variant="cream" className="p-8 text-center max-w-lg mx-auto space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#E2ECE4] border border-[#C7DBD0] flex items-center justify-center text-[#437151]">
            <LogIn size={22} />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-[#1C1F1D]">Sign in to View Health Tracking</h1>
            <p className="text-xs text-[#575E59]">
              LocalFit secures your body composition, hydration, and sleep logs with authenticated database isolation.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Button href="/login" variant="primary" size="md">
              Sign In
            </Button>
            <Button href="/register" variant="outline" size="md">
              Create Account
            </Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  // ----------------------------------------------------------------------------
  // Render: Loading Skeleton
  // ----------------------------------------------------------------------------
  if (isLoading) {
    return (
      <PageContainer size="wide" className="py-12 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#E8E5DD]">
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-[#EFEBE1] animate-pulse" />
            <div className="h-8 w-64 rounded bg-[#EFEBE1] animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-[#EFEBE1]/60 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-[#EFEBE1]/40 animate-pulse" />
      </PageContainer>
    );
  }

  const latestWeight = weights.length > 0 ? weights[0].weight_kg : biometrics?.weightKg || null;

  return (
    <PageContainer size="wide" className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#E8E5DD]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C7DBD0] bg-[#E2ECE4] px-2.5 py-0.5 text-[11px] font-semibold text-[#263B2C] mb-2">
            <TrendingUp size={12} className="text-[#375A41]" />
            <span>Authenticated Health Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1F1D]">
            Health Progress & Habits
          </h1>
          <p className="text-xs sm:text-sm text-[#575E59] mt-0.5">
            Body composition, hydration consistency, sleep architecture, and personal targets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => setGoalsModalOpen(true)}
            className="text-xs flex items-center gap-1.5"
          >
            <Target size={14} className="text-[#437151]" />
            Configure Goals
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => {
              setEditingWeight(null);
              setWeightModalOpen(true);
            }}
            className="text-xs flex items-center gap-1.5"
          >
            <Scale size={14} />
            Log Weigh-In
          </Button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="rounded-xl border border-[#C7DBD0] bg-[#E2ECE4] p-3 text-xs font-semibold text-[#263B2C] flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 size={16} className="text-[#375A41] shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="rounded-xl border border-[#FCA5A5] bg-[#FEE2E2] p-3 text-xs font-semibold text-[#B91C1C] flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRetry}
            className="text-xs text-[#B91C1C] hover:bg-[#FCA5A5]/30 h-7"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Date Navigation Bar for Daily Hydration & Sleep */}
      <HealthDateSelector
        selectedDate={selectedDate}
        onSelectDate={handleDateChange}
      />

      {/* OVERVIEW METRIC CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Current Weight */}
        <Card variant="default" className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717A73]">
              Recorded Weight
            </span>
            <div className="p-1.5 rounded-lg bg-[#E2ECE4] text-[#375A41]">
              <Scale size={14} />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#1C1F1D]">
            {latestWeight ? `${latestWeight} kg` : "—"}
          </p>
          <p className="text-[11px] text-[#575E59]">
            {weights.length > 0 ? `${weights.length} weigh-ins recorded` : "No weigh-ins yet"}
          </p>
        </Card>

        {/* Metric 2: Net Trajectory */}
        <Card variant="default" className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717A73]">
              Weight Trajectory
            </span>
            <div className="p-1.5 rounded-lg bg-[#E2ECE4] text-[#375A41]">
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-[#1C1F1D]">
              {weightChange
                ? `${weightChange.differenceKg > 0 ? "+" : ""}${weightChange.differenceKg} kg`
                : "0.0 kg"}
            </p>
            {weightChange && (
              <Badge
                variant={
                  weightChange.direction === "loss"
                    ? "sage"
                    : weightChange.direction === "gain"
                    ? "olive"
                    : "neutral"
                }
                size="sm"
              >
                {weightChange.direction}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-[#575E59]">Delta vs previous weigh-in</p>
        </Card>

        {/* Metric 3: Water Intake */}
        <Card variant="default" className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717A73]">
              Hydration ({selectedDate.slice(5)})
            </span>
            <div className="p-1.5 rounded-lg bg-[#E0F2FE] text-[#0369A1]">
              <Droplets size={14} />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0369A1]">
            {waterSummary?.totalMl || 0} ml
          </p>
          <p className="text-[11px] text-[#575E59]">
            {waterGoal ? `Goal: ${waterGoal} ml` : "No hydration goal set"}
          </p>
        </Card>

        {/* Metric 4: Sleep Duration */}
        <Card variant="default" className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717A73]">
              Sleep Rest ({selectedDate.slice(5)})
            </span>
            <div className="p-1.5 rounded-lg bg-[#EDE9FE] text-[#6D28D9]">
              <Moon size={14} />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#6D28D9]">
            {sleepSummary?.formattedDuration || "0m"}
          </p>
          <p className="text-[11px] text-[#575E59]">
            {sleepGoal ? `Target: ${Math.round(sleepGoal / 60)}h` : "No sleep target set"}
          </p>
        </Card>
      </div>

      {/* BMI SCREENING COMPONENT */}
      <BmiScreeningCard
        heightCm={biometrics?.heightCm}
        weightKg={latestWeight}
        onOpenWeightModal={() => {
          setEditingWeight(null);
          setWeightModalOpen(true);
        }}
      />

      {/* WEIGHT TREND CHART (Real Database Records) */}
      <WeightTrendChart
        weights={weights}
        heightCm={biometrics?.heightCm}
      />

      {/* WEIGHT TRACKER & HISTORY */}
      <WeightTrackerCard
        weights={weights}
        weightChange={weightChange}
        onAddClick={() => {
          setEditingWeight(null);
          setWeightModalOpen(true);
        }}
        onEditClick={(entry) => {
          setEditingWeight(entry);
          setWeightModalOpen(true);
        }}
        onDeleteClick={(entry) => {
          openDeleteDialog(
            "weight",
            `${entry.weight_kg} kg on ${entry.logged_date}`,
            entry.id
          );
        }}
      />

      {/* WATER & SLEEP TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hydration Tracker */}
        <WaterTrackerCard
          summary={waterSummary}
          logs={waterLogs}
          dailyWaterGoalMl={waterGoal}
          selectedDate={selectedDate}
          onAddClick={() => {
            setEditingWater(null);
            setWaterModalOpen(true);
          }}
          onQuickAdd={handleQuickAddWater}
          onEditClick={(entry) => {
            setEditingWater(entry);
            setWaterModalOpen(true);
          }}
          onDeleteClick={(entry) => {
            openDeleteDialog(
              "water",
              `${entry.amount_ml} ml on ${entry.intake_date}`,
              entry.id
            );
          }}
          onOpenGoalsModal={() => setGoalsModalOpen(true)}
        />

        {/* Sleep Tracker */}
        <SleepTrackerCard
          summary={sleepSummary}
          logs={sleepLogs}
          dailySleepGoalMinutes={sleepGoal}
          selectedDate={selectedDate}
          onAddClick={() => {
            setEditingSleep(null);
            setSleepModalOpen(true);
          }}
          onEditClick={(entry) => {
            setEditingSleep(entry);
            setSleepModalOpen(true);
          }}
          onDeleteClick={(entry) => {
            openDeleteDialog(
              "sleep",
              `${entry.duration_minutes}m on ${entry.sleep_date}`,
              entry.id
            );
          }}
          onOpenGoalsModal={() => setGoalsModalOpen(true)}
        />
      </div>

      {/* MODALS */}
      <WeightEntryModal
        isOpen={weightModalOpen}
        initialEntry={editingWeight}
        onClose={() => setWeightModalOpen(false)}
        onSubmit={handleSaveWeight}
      />

      <WaterEntryModal
        isOpen={waterModalOpen}
        initialEntry={editingWater}
        defaultDate={selectedDate}
        onClose={() => setWaterModalOpen(false)}
        onSubmit={handleSaveWater}
      />

      <SleepEntryModal
        isOpen={sleepModalOpen}
        initialEntry={editingSleep}
        defaultDate={selectedDate}
        onClose={() => setSleepModalOpen(false)}
        onSubmit={handleSaveSleep}
      />

      <HealthGoalsModal
        isOpen={goalsModalOpen}
        initialWaterGoalMl={waterGoal}
        initialSleepGoalMinutes={sleepGoal}
        calorieGoal={calorieGoal}
        proteinGoalG={proteinGoal}
        onClose={() => setGoalsModalOpen(false)}
        onSubmit={handleSaveGoals}
      />

      <DeleteHealthDialog
        isOpen={deleteDialogState.isOpen}
        itemType={deleteDialogState.itemType}
        itemDescription={deleteDialogState.itemDescription}
        onClose={() =>
          setDeleteDialogState((prev) => ({ ...prev, isOpen: false }))
        }
        onConfirm={handleConfirmDelete}
      />
    </PageContainer>
  );
}

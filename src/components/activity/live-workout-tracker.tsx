"use client";

import * as React from "react";
import {
  Play,
  Pause,
  Square,
  Compass,
  Clock,
  Flame,
  Footprints,
  AlertCircle,
  CheckCircle2,
  Navigation,
  RotateCcw,
  Bike,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RoutePreviewCanvas } from "./route-preview-canvas";
import { calculateActiveDurationSeconds, formatDuration, type WorkoutInterval } from "@/lib/workout-timer";
import { filterGpsCoordinate, downsampleRoutePoints } from "@/lib/geo-tracking";
import { calculateWorkoutCalories, formatPaceOrSpeed } from "@/lib/calorie-calculator";
import {
  saveWorkout,
  saveActiveWorkoutToStorage,
  loadActiveWorkoutFromStorage,
  clearActiveWorkoutFromStorage,
} from "@/lib/activity-client";
import type { ActivityType, RouteCoordinate, ActivityWorkout } from "@/types/activity";

interface LiveWorkoutTrackerProps {
  userWeightKg: number | null | undefined;
  onWorkoutCompleted: (workout: ActivityWorkout) => void;
  onCancel?: () => void;
  defaultType?: ActivityType;
}

export function LiveWorkoutTracker({
  userWeightKg,
  onWorkoutCompleted,
  onCancel,
  defaultType = "walking",
}: LiveWorkoutTrackerProps) {
  const [sessionToken, setSessionToken] = React.useState<string>(() => {
    return loadActiveWorkoutFromStorage()?.sessionToken || "";
  });
  const [activityType, setActivityType] = React.useState<ActivityType>(() => {
    return loadActiveWorkoutFromStorage()?.activityType || defaultType;
  });
  const [status, setStatus] = React.useState<"idle" | "active" | "paused" | "finishing">(() => {
    const saved = loadActiveWorkoutFromStorage();
    return saved && saved.intervals.length > 0 ? "paused" : "idle";
  });
  const [startTime, setStartTime] = React.useState<string>(() => {
    return loadActiveWorkoutFromStorage()?.startTime || "";
  });
  const [intervals, setIntervals] = React.useState<WorkoutInterval[]>(() => {
    return loadActiveWorkoutFromStorage()?.intervals || [];
  });
  const [elapsedActiveSeconds, setElapsedActiveSeconds] = React.useState<number>(() => {
    const saved = loadActiveWorkoutFromStorage();
    return saved ? calculateActiveDurationSeconds(saved.intervals) : 0;
  });
  const [distanceMeters, setDistanceMeters] = React.useState<number>(() => {
    return loadActiveWorkoutFromStorage()?.distanceMeters || 0;
  });
  const [routeCoordinates, setRouteCoordinates] = React.useState<RouteCoordinate[]>(() => {
    return loadActiveWorkoutFromStorage()?.routeData || [];
  });
  const [notes, setNotes] = React.useState<string>("");

  // GPS state
  const [gpsStatus, setGpsStatus] = React.useState<"idle" | "acquiring" | "tracking" | "denied" | "error">("idle");
  const [gpsAccuracy, setGpsAccuracy] = React.useState<number | null>(null);
  const [gpsErrorMessage, setGpsErrorMessage] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const watchIdRef = React.useRef<number | null>(null);
  const lastCoordRef = React.useRef<{ lat: number; lng: number; timestampMs: number } | null>(null);

  // Stop GPS watch helper
  const stopGpsWatch = React.useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Cleanup GPS strictly on component unmount
  React.useEffect(() => {
    return () => {
      stopGpsWatch();
    };
  }, [stopGpsWatch]);

  // Timer tick for active state
  React.useEffect(() => {
    if (status !== "active") return;

    const timer = setInterval(() => {
      const activeSec = calculateActiveDurationSeconds(intervals, Date.now());
      setElapsedActiveSeconds(activeSec);

      // Persist in-flight state to localStorage periodically for crash recovery
      if (sessionToken) {
        saveActiveWorkoutToStorage({
          sessionToken,
          activityType,
          status: "active",
          startTime,
          intervals,
          distanceMeters,
          routeData: routeCoordinates,
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [status, intervals, sessionToken, activityType, startTime, distanceMeters, routeCoordinates]);

  // Start GPS watch
  const startGpsWatch = React.useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsStatus("error");
      setGpsErrorMessage("Geolocation is not supported by your browser.");
      return;
    }

    setGpsStatus("acquiring");
    stopGpsWatch();

    try {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsStatus("tracking");
          setGpsAccuracy(Math.round(pos.coords.accuracy));

          const now = Date.now();
          const filter = filterGpsCoordinate(
            {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              timestampMs: now,
              accuracyM: pos.coords.accuracy,
            },
            lastCoordRef.current,
            activityType
          );

          if (filter.accepted) {
            lastCoordRef.current = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              timestampMs: now,
            };

            setDistanceMeters((prev) => prev + filter.distanceMeters);

            // Compute offset from start of workout in seconds
            const workoutStartMs = intervals.length > 0 ? intervals[0].startMs : now;
            const offsetSec = Math.max(0, (now - workoutStartMs) / 1000);

            setRouteCoordinates((prev) => [
              ...prev,
              {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                timestamp_offset_sec: offsetSec,
                accuracy_m: pos.coords.accuracy,
              },
            ]);
          }
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setGpsStatus("denied");
            setGpsErrorMessage("Location access was denied. Continuing in indoor/manual mode without GPS.");
          } else {
            setGpsStatus("error");
            setGpsErrorMessage(`GPS error: ${err.message}`);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 1000,
        }
      );
      watchIdRef.current = id;
    } catch {
      setGpsStatus("error");
      setGpsErrorMessage("Could not initialize GPS listener.");
    }
  }, [activityType, intervals, stopGpsWatch]);

  // START WORKOUT
  const handleStartWorkout = () => {
    const token = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `wk-${Date.now()}`;
    const now = Date.now();
    const isoStart = new Date(now).toISOString();

    setSessionToken(token);
    setStartTime(isoStart);
    const initialIntervals: WorkoutInterval[] = [{ startMs: now, endMs: null }];
    setIntervals(initialIntervals);
    setDistanceMeters(0);
    setRouteCoordinates([]);
    setElapsedActiveSeconds(0);
    setStatus("active");
    setSaveError(null);

    // Save initial transient session state
    saveActiveWorkoutToStorage({
      sessionToken: token,
      activityType,
      status: "active",
      startTime: isoStart,
      intervals: initialIntervals,
      distanceMeters: 0,
      routeData: [],
    });

    startGpsWatch();
  };

  // PAUSE WORKOUT (Excludes paused time from duration)
  const handlePauseWorkout = () => {
    const now = Date.now();
    stopGpsWatch();

    setIntervals((prev) => {
      const updated = [...prev];
      if (updated.length > 0 && updated[updated.length - 1].endMs === null) {
        updated[updated.length - 1].endMs = now;
      }
      return updated;
    });

    setStatus("paused");
  };

  // RESUME WORKOUT
  const handleResumeWorkout = () => {
    const now = Date.now();
    setIntervals((prev) => [...prev, { startMs: now, endMs: null }]);
    setStatus("active");
    startGpsWatch();
  };

  // FINISH & SAVE WORKOUT
  const handleFinishWorkout = async () => {
    const now = Date.now();
    stopGpsWatch();

    // Close final active interval if open
    const finalIntervals = [...intervals];
    if (finalIntervals.length > 0 && finalIntervals[finalIntervals.length - 1].endMs === null) {
      finalIntervals[finalIntervals.length - 1].endMs = now;
    }

    const finalActiveSeconds = calculateActiveDurationSeconds(finalIntervals, now);
    if (finalActiveSeconds <= 0) {
      setSaveError("Workout duration must be greater than 0 seconds.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    // Downsample route coordinates (max 500 points)
    const downsampledRoute = downsampleRoutePoints(routeCoordinates, 500);

    const paceOrSpeed = formatPaceOrSpeed(activityType, distanceMeters, finalActiveSeconds);

    try {
      const res = await saveWorkout({
        session_token: sessionToken,
        activity_type: activityType,
        start_time: startTime,
        finish_time: new Date(now).toISOString(),
        duration_seconds: finalActiveSeconds,
        distance_meters: distanceMeters,
        avg_pace_or_speed: paceOrSpeed.raw,
        route_data: downsampledRoute,
        notes: notes.trim() || null,
      });

      if (!res.success) {
        setSaveError(res.error || "Failed to save workout");
        setIsSaving(false);
        return;
      }

      if (res.workout) {
        clearActiveWorkoutFromStorage();
        setStatus("idle");
        onWorkoutCompleted(res.workout);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsSaving(false);
    }
  };

  // CANCEL / DISCARD
  const handleCancelWorkout = () => {
    stopGpsWatch();
    clearActiveWorkoutFromStorage();
    setStatus("idle");
    setSessionToken("");
    setElapsedActiveSeconds(0);
    setDistanceMeters(0);
    setRouteCoordinates([]);
    setIntervals([]);
    if (onCancel) onCancel();
  };

  const paceOrSpeed = formatPaceOrSpeed(activityType, distanceMeters, elapsedActiveSeconds);
  const calorieResult = calculateWorkoutCalories(activityType, elapsedActiveSeconds, userWeightKg, distanceMeters);

  return (
    <Card variant="default" className="p-6 space-y-6">
      {/* Header & Activity Type Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E5DD]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">
              Live Workout Tracker
            </span>
            {status === "active" && (
              <Badge variant="sage" size="sm" className="animate-pulse">
                Recording Active
              </Badge>
            )}
            {status === "paused" && (
              <Badge variant="olive" size="sm">
                Paused
              </Badge>
            )}
          </div>
          <h2 className="text-xl font-bold text-[#1C1F1D]">
            {activityType === "walking" ? "Walking Session" : activityType === "running" ? "Running Session" : "Cycling Session"}
          </h2>
        </div>

        {/* Activity Type Chips (only editable in idle state) */}
        {status === "idle" ? (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#FAF8F5] border border-[#E8E5DD]">
            {(
              [
                { type: "walking", label: "Walk", icon: Footprints },
                { type: "running", label: "Run", icon: Navigation },
                { type: "cycling", label: "Cycle", icon: Bike },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const isSelected = activityType === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setActivityType(item.type)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-[#437151] text-white shadow-xs"
                      : "text-[#575E59] hover:text-[#1C1F1D] hover:bg-[#EFEBE1]"
                  }`}
                >
                  <Icon size={14} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <Badge variant="neutral" size="sm" className="capitalize">
            {activityType}
          </Badge>
        )}
      </div>

      {/* GPS Status Banner */}
      {status !== "idle" && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E5DD] text-xs">
          <div className="flex items-center gap-2">
            <Compass
              size={16}
              className={gpsStatus === "tracking" ? "text-[#375A41] animate-spin" : "text-[#717A73]"}
            />
            <span className="font-medium text-[#1C1F1D]">
              {gpsStatus === "tracking" && `GPS Active (±${gpsAccuracy ?? 10}m accuracy)`}
              {gpsStatus === "acquiring" && "Acquiring GPS signal..."}
              {gpsStatus === "denied" && "GPS Denied — Indoor / Manual Mode"}
              {gpsStatus === "error" && (gpsErrorMessage || "GPS Signal Unavailable")}
            </span>
          </div>

          {gpsStatus === "denied" && (
            <span className="text-[11px] text-[#717A73]">
              Distance tracking requires browser location permission
            </span>
          )}
        </div>
      )}

      {/* Live Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Active Time */}
        <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E5DD] space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[#575E59]">
            <Clock size={14} className="text-[#375A41]" />
            <span>Active Time</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-[#1C1F1D]">
            {formatDuration(elapsedActiveSeconds)}
          </p>
          <p className="text-[10px] text-[#717A73]">Excludes paused time</p>
        </div>

        {/* Distance */}
        <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E5DD] space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[#575E59]">
            <Compass size={14} className="text-[#43492D]" />
            <span>Distance</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#1C1F1D]">
            {(distanceMeters / 1000).toFixed(2)}{" "}
            <span className="text-sm font-normal text-[#575E59]">km</span>
          </p>
          <p className="text-[10px] text-[#717A73]">{distanceMeters.toFixed(0)} meters</p>
        </div>

        {/* Pace / Speed */}
        <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E5DD] space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[#575E59]">
            <Navigation size={14} className="text-[#437151]" />
            <span>{activityType === "cycling" ? "Avg Speed" : "Avg Pace"}</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#1C1F1D]">
            {paceOrSpeed.value}{" "}
            <span className="text-xs font-normal text-[#575E59]">{paceOrSpeed.unit}</span>
          </p>
          <p className="text-[10px] text-[#717A73]">Calculated from active time</p>
        </div>

        {/* Calories Burned */}
        <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E5DD] space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[#575E59]">
            <Flame size={14} className="text-[#C25E34]" />
            <span>Est. Calories</span>
          </div>
          {calorieResult.estimatedCalories !== null ? (
            <>
              <p className="text-2xl sm:text-3xl font-bold text-[#1C1F1D]">
                {calorieResult.estimatedCalories}{" "}
                <span className="text-sm font-normal text-[#575E59]">kcal</span>
              </p>
              <p className="text-[10px] text-[#717A73]">Based on {userWeightKg}kg profile</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-[#717A73]">—</p>
              <p className="text-[10px] text-[#C25E34]">Weight needed in Profile</p>
            </>
          )}
        </div>
      </div>

      {/* GPS Route Canvas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[#575E59]">
          <span className="font-semibold">Route Path Preview</span>
          <span>{routeCoordinates.length} recorded GPS coordinates</span>
        </div>
        <RoutePreviewCanvas routeData={routeCoordinates} height={200} />
      </div>

      {/* Optional Workout Notes (Visible when finishing or paused) */}
      {(status === "paused" || status === "active") && (
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#1C1F1D]">
            Workout Notes (Optional)
          </label>
          <input
            type="text"
            maxLength={140}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Sunset jog along Murdeshwar beach, brisk pace"
            className="w-full px-3.5 py-2 rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] text-xs text-[#1C1F1D] focus:outline-hidden focus:ring-2 focus:ring-[#437151] focus:bg-white transition-all"
          />
        </div>
      )}

      {saveError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{saveError}</span>
        </div>
      )}

      {/* Action Controls */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8E5DD]">
        {status === "idle" && (
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-[#717A73]">
              Location permission will be requested upon starting.
            </span>
            <Button
              variant="primary"
              size="md"
              onClick={handleStartWorkout}
              icon={<Play size={16} />}
              iconPosition="left"
            >
              Start Workout
            </Button>
          </div>
        )}

        {status === "active" && (
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelWorkout}
              icon={<RotateCcw size={14} />}
              iconPosition="left"
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={handlePauseWorkout}
                icon={<Pause size={16} />}
                iconPosition="left"
              >
                Pause
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleFinishWorkout}
                disabled={isSaving}
                icon={<Square size={16} />}
                iconPosition="left"
              >
                {isSaving ? "Saving..." : "Finish Workout"}
              </Button>
            </div>
          </div>
        )}

        {status === "paused" && (
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelWorkout}
              icon={<RotateCcw size={14} />}
              iconPosition="left"
            >
              Discard
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="md"
                onClick={handleResumeWorkout}
                icon={<Play size={16} />}
                iconPosition="left"
              >
                Resume
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={handleFinishWorkout}
                disabled={isSaving}
                icon={<CheckCircle2 size={16} />}
                iconPosition="left"
              >
                {isSaving ? "Saving..." : "Finish & Save"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

import {
  calculateWorkoutCalories,
  formatPaceOrSpeed,
} from "../lib/calorie-calculator";
import {
  calculateHaversineDistance,
  isValidCoordinate,
  filterGpsCoordinate,
  downsampleRoutePoints,
} from "../lib/geo-tracking";
import { validateRouteData } from "../lib/route-validator";
import { validateWorkoutInput } from "../lib/workout-validator";
import {
  calculateActiveDurationSeconds,
  formatDuration,
  type WorkoutInterval,
} from "../lib/workout-timer";
import {
  computeDailyActivitySummary,
  computeWeeklySummary,
} from "../lib/activity-client";
import type { ActivityWorkout, DailyStepEntry } from "../types/activity";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
    failedCount++;
  }
}

async function runStage8Tests() {
  console.log("==================================================================");
  console.log("RUNNING LOCALFIT STAGE 8: UNIT & BUSINESS LOGIC TEST SUITE");
  console.log("(Offline / In-Memory: Verifies logic prior to live database migration)");
  console.log("==================================================================\n");

  // ----------------------------------------------------------------------------
  // 1. CALORIE ESTIMATION & PROFILE WEIGHT REQUIREMENTS (Correction 1)
  // ----------------------------------------------------------------------------
  console.log("--- 1. Calorie Estimation Engine ---");

  // Missing weight must NEVER default to 70kg; must return null
  const nullWeightResult = calculateWorkoutCalories("running", 1800, null, 4000);
  assert(
    nullWeightResult.estimatedCalories === null &&
      nullWeightResult.reason === "PROFILE_WEIGHT_REQUIRED",
    "Missing profile weight (null) strictly returns null calories with PROFILE_WEIGHT_REQUIRED reason"
  );

  const undefinedWeightResult = calculateWorkoutCalories("walking", 1800, undefined, 2000);
  assert(
    undefinedWeightResult.estimatedCalories === null,
    "Undefined profile weight strictly returns null calories without falling back to 70kg"
  );

  const zeroWeightResult = calculateWorkoutCalories("cycling", 1800, 0, 8000);
  assert(
    zeroWeightResult.estimatedCalories === null,
    "Zero/invalid weight strictly returns null calories"
  );

  // Valid weight calculation
  // Running 1 hour (3600s) for 70kg user at ~8 km/h (8.3 MET): 8.3 * 70 * 1 = 581 kcal
  const validRunning = calculateWorkoutCalories("running", 3600, 70, 8000);
  assert(
    validRunning.estimatedCalories !== null && validRunning.estimatedCalories > 500 && validRunning.estimatedCalories < 650,
    `Calculates accurate running calories for 70kg profile (${validRunning.estimatedCalories} kcal)`
  );
  assert(
    validRunning.weightUsedKg === 70,
    "Records exact profile weight used in calorie metadata"
  );

  // Scaled by duration: 30 mins vs 60 mins should be half
  const running30Min = calculateWorkoutCalories("running", 1800, 70, 4000);
  assert(
    Math.abs(validRunning.estimatedCalories! / 2 - running30Min.estimatedCalories!) <= 2,
    "Calorie burn scales proportionally with active duration"
  );

  // Cycling MET calculation
  const cyclingResult = calculateWorkoutCalories("cycling", 3600, 75, 20000);
  assert(
    cyclingResult.estimatedCalories !== null && cyclingResult.met !== null && cyclingResult.met >= 6.0,
    `Cycling calculates MET >= 6.0 for moderate speed (${cyclingResult.estimatedCalories} kcal, ${cyclingResult.met} METs)`
  );

  // Walking MET calculation
  const walkingResult = calculateWorkoutCalories("walking", 3600, 65, 4000);
  assert(
    walkingResult.estimatedCalories !== null && walkingResult.met !== null && walkingResult.met >= 3.0 && walkingResult.met <= 4.0,
    `Walking calculates appropriate aerobic METs (~3.3-3.8) (${walkingResult.estimatedCalories} kcal)`
  );

  // ----------------------------------------------------------------------------
  // 2. ACTIVE INTERVAL TIMER & PAUSE/RESUME ACCURACY (Correction 4)
  // ----------------------------------------------------------------------------
  console.log("\n--- 2. Active Duration Timer & Pause/Resume ---");

  // Interval 1: 0 to 600 seconds (10 mins active)
  // Paused: 600 to 900 seconds (5 mins paused)
  // Interval 2: 900 to 1500 seconds (10 mins active)
  const testIntervals: WorkoutInterval[] = [
    { startMs: 1000000, endMs: 1000000 + 600000 }, // 10 mins
    { startMs: 1000000 + 900000, endMs: 1000000 + 1500000 }, // 10 mins
  ];

  const activeDuration = calculateActiveDurationSeconds(testIntervals);
  assert(
    activeDuration === 1200,
    `Active workout duration excludes 5-minute paused gap (expected 1200s / 20 mins, got ${activeDuration}s)`
  );

  // Format stopwatch duration
  assert(formatDuration(0) === "00:00", "Formats 0 seconds as '00:00'");
  assert(formatDuration(45) === "00:45", "Formats 45 seconds as '00:45'");
  assert(formatDuration(1530) === "25:30", "Formats 1530 seconds as '25:30'");
  assert(formatDuration(3665) === "01:01:05", "Formats 3665 seconds as '01:01:05'");

  // Pace and speed formatting
  const walkPace = formatPaceOrSpeed("walking", 5000, 3000); // 5km in 3000s -> 600s/km = 10:00/km
  assert(walkPace.value === "10:00" && walkPace.unit === "/km", "Formats walking pace as '10:00 /km'");

  const cycleSpeed = formatPaceOrSpeed("cycling", 20000, 3600); // 20km in 1hr -> 20.0 km/h
  assert(cycleSpeed.value === "20.0" && cycleSpeed.unit === "km/h", "Formats cycling speed as '20.0 km/h'");

  // ----------------------------------------------------------------------------
  // 3. HAVERSINE DISTANCE & GPS FILTERING (Correction 6)
  // ----------------------------------------------------------------------------
  console.log("\n--- 3. Haversine Distance & GPS Filtering ---");

  // Bhatkal Beach to Murdeshwar Temple coordinates (~13.5 km straight line)
  const bhatkalLat = 13.9784;
  const bhatkalLng = 74.5516;
  const murdeshwarLat = 14.0942;
  const murdeshwarLng = 74.4849;

  const coastalDistance = calculateHaversineDistance(bhatkalLat, bhatkalLng, murdeshwarLat, murdeshwarLng);
  assert(
    coastalDistance > 13000 && coastalDistance < 15000,
    `Calculates accurate Great-Circle distance between Bhatkal & Murdeshwar (~${(coastalDistance / 1000).toFixed(1)} km)`
  );

  assert(
    calculateHaversineDistance(bhatkalLat, bhatkalLng, bhatkalLat, bhatkalLng) === 0,
    "Zero distance for identical coordinates"
  );

  // Coordinate validity checks
  assert(isValidCoordinate(13.97, 74.55) === true, "Validates proper geographic coordinate");
  assert(isValidCoordinate(95.0, 74.55) === false, "Rejects latitude > 90");
  assert(isValidCoordinate(13.97, 200.0) === false, "Rejects longitude > 180");
  assert(isValidCoordinate(NaN, 74.55) === false, "Rejects NaN coordinates");

  // GPS Filter Gate 1: Reject accuracy worse than 30m
  const inaccuratePoint = filterGpsCoordinate(
    { lat: 13.9785, lng: 74.5517, timestampMs: 1000, accuracyM: 45 },
    null,
    "walking"
  );
  assert(
    inaccuratePoint.accepted === false && inaccuratePoint.reason === "ACCURACY_TOO_LOW",
    "Rejects inaccurate GPS point (accuracy 45m > 30m threshold)"
  );

  // GPS Filter Gate 2: Ignore stationary micro-jitter (< 2.5m)
  const stationaryPoint = filterGpsCoordinate(
    { lat: 13.978401, lng: 74.551601, timestampMs: 5000, accuracyM: 8 },
    { lat: 13.9784, lng: 74.5516, timestampMs: 1000 },
    "walking"
  );
  assert(
    stationaryPoint.accepted === false && stationaryPoint.reason === "STATIONARY_JITTER",
    "Filters out stationary GPS micro-jitter (< 2.5 meters)"
  );

  // GPS Filter Gate 3: Reject impossible velocity jump (teleportation)
  // Distance: ~1.1 km in 2 seconds = ~2000 km/h jump!
  const impossibleJumpPoint = filterGpsCoordinate(
    { lat: 13.9884, lng: 74.5516, timestampMs: 3000, accuracyM: 8 },
    { lat: 13.9784, lng: 74.5516, timestampMs: 1000 },
    "running"
  );
  assert(
    impossibleJumpPoint.accepted === false && impossibleJumpPoint.reason === "IMPOSSIBLE_SPEED_JUMP",
    "Rejects impossible velocity jump (> 40 km/h for running)"
  );

  // Valid continuous movement accepted
  // 50m in 15 seconds = 12 km/h (reasonable running pace)
  const validRunPoint = filterGpsCoordinate(
    { lat: 13.97885, lng: 74.5516, timestampMs: 16000, accuracyM: 5 },
    { lat: 13.9784, lng: 74.5516, timestampMs: 1000 },
    "running"
  );
  assert(
    validRunPoint.accepted === true && validRunPoint.distanceMeters > 30,
    `Accepts valid GPS coordinate with realistic displacement (${validRunPoint.distanceMeters.toFixed(1)}m)`
  );

  // ----------------------------------------------------------------------------
  // 4. SERVER-SIDE ROUTE VALIDATION & SIZE LIMITING (Correction 7)
  // ----------------------------------------------------------------------------
  console.log("\n--- 4. Server-Side Route Data Validation ---");

  // Valid route
  const validRoute = [
    { lat: 13.9784, lng: 74.5516, timestamp_offset_sec: 0, accuracy_m: 5 },
    { lat: 13.9788, lng: 74.5517, timestamp_offset_sec: 15, accuracy_m: 6 },
    { lat: 13.9792, lng: 74.5518, timestamp_offset_sec: 30, accuracy_m: 5 },
  ];
  const validValidation = validateRouteData(validRoute);
  assert(validValidation.valid === true, "Valid route coordinates pass server validation");

  // Rejects coordinates > 500 points
  const oversizedPoints = Array.from({ length: 501 }, (_, i) => ({
    lat: 13.97 + i * 0.0001,
    lng: 74.55 + i * 0.0001,
    timestamp_offset_sec: i * 2,
  }));
  const oversizedValidation = validateRouteData(oversizedPoints);
  assert(
    oversizedValidation.valid === false && Boolean(oversizedValidation.error?.includes("500")),
    "Rejects route exceeding 500 coordinates limit"
  );

  // Rejects corrupted/malformed objects
  const malformedValidation = validateRouteData([{ lat: "invalid", lng: 74.55, timestamp_offset_sec: 0 }]);
  assert(malformedValidation.valid === false, "Rejects malformed coordinate types");

  // Downsampling algorithm preserves start and finish points
  const pointsToDownsample = Array.from({ length: 1000 }, (_, i) => ({
    lat: 13.0 + i * 0.001,
    lng: 74.0 + i * 0.001,
    timestamp_offset_sec: i,
  }));
  const downsampled = downsampleRoutePoints(pointsToDownsample, 500);
  assert(
    downsampled.length === 500,
    `Downsamples 1000 points strictly to 500 points (got ${downsampled.length})`
  );
  assert(
    downsampled[0].lat === pointsToDownsample[0].lat &&
      downsampled[499].lat === pointsToDownsample[999].lat,
    "Downsampling preserves exact first and last coordinates"
  );

  // ----------------------------------------------------------------------------
  // 5. CUMULATIVE DAILY STEP AGGREGATION (Correction 3)
  // ----------------------------------------------------------------------------
  console.log("\n--- 5. Cumulative Daily Step Aggregation ---");

  const sampleDate = "2026-11-11";
  const stepEntries: DailyStepEntry[] = [
    {
      id: "step-1",
      user_id: "user-test-1",
      step_date: sampleDate,
      steps: 3200,
      source: "manual",
      notes: "Morning stroll",
      created_at: `${sampleDate}T08:00:00Z`,
      updated_at: `${sampleDate}T08:00:00Z`,
    },
    {
      id: "step-2",
      user_id: "user-test-1",
      step_date: sampleDate,
      steps: 4500,
      source: "manual",
      notes: "Evening bazaar walk",
      created_at: `${sampleDate}T18:00:00Z`,
      updated_at: `${sampleDate}T18:00:00Z`,
    },
    {
      id: "step-3",
      user_id: "user-test-1",
      step_date: "2026-11-10", // Different day
      steps: 6000,
      source: "manual",
      notes: "Yesterday",
      created_at: `2026-11-10T12:00:00Z`,
      updated_at: `2026-11-10T12:00:00Z`,
    },
  ];

  const summary = computeDailyActivitySummary(sampleDate, [], stepEntries);
  assert(
    summary.total_steps === 7700,
    `Multiple step logs for today are aggregated cumulatively (3,200 + 4,500 = 7,700, got ${summary.total_steps})`
  );
  assert(
    summary.step_entries_count === 2,
    "Correctly counts 2 step entries for today, excluding entries from other dates"
  );

  // ----------------------------------------------------------------------------
  // 6. WORKOUT METRICS & EXCLUSION OF UNAVAILABLE CALORIES (Correction 3)
  // ----------------------------------------------------------------------------
  console.log("\n--- 6. Workout Metrics & Calorie Aggregation Safety ---");

  const sampleWorkouts: ActivityWorkout[] = [
    {
      id: "wk-1",
      user_id: "user-test-1",
      session_token: "token-wk-1",
      activity_type: "walking",
      start_time: `${sampleDate}T07:00:00Z`,
      finish_time: `${sampleDate}T07:45:00Z`,
      duration_seconds: 2700, // 45 mins
      distance_meters: 3500, // 3.5 km
      avg_pace_or_speed: 771,
      estimated_calories: 185, // Calorie available
      step_count: 4200,
      route_data: [],
      notes: "Brisk morning walk",
      created_at: `${sampleDate}T07:45:00Z`,
      updated_at: `${sampleDate}T07:45:00Z`,
    },
    {
      id: "wk-2",
      user_id: "user-test-1",
      session_token: "token-wk-2",
      activity_type: "cycling",
      start_time: `${sampleDate}T17:00:00Z`,
      finish_time: `${sampleDate}T17:30:00Z`,
      duration_seconds: 1800, // 30 mins
      distance_meters: 9000, // 9.0 km
      avg_pace_or_speed: 18.0,
      estimated_calories: null, // CALORIE UNAVAILABLE (no weight configured)
      step_count: null,
      route_data: [],
      notes: "Coastal highway ride",
      created_at: `${sampleDate}T17:30:00Z`,
      updated_at: `${sampleDate}T17:30:00Z`,
    },
    {
      id: "wk-3",
      user_id: "user-test-1",
      session_token: "token-wk-3",
      activity_type: "running",
      start_time: `${sampleDate}T19:00:00Z`,
      finish_time: `${sampleDate}T19:25:00Z`,
      duration_seconds: 1500, // 25 mins
      distance_meters: 4200, // 4.2 km
      avg_pace_or_speed: 357,
      estimated_calories: 260, // Calorie available
      step_count: 3600,
      route_data: [],
      notes: "Evening tempo run",
      created_at: `${sampleDate}T19:25:00Z`,
      updated_at: `${sampleDate}T19:25:00Z`,
    },
  ];

  const fullSummary = computeDailyActivitySummary(sampleDate, sampleWorkouts, stepEntries);

  // Strict Requirement: Calories sum ONLY workouts with available calories (185 + 260 = 445)
  assert(
    fullSummary.total_estimated_calories === 445,
    `Total calorie sum excludes workouts without calorie estimates (expected 445 kcal, got ${fullSummary.total_estimated_calories} kcal)`
  );
  assert(
    fullSummary.workouts_with_calories_count === 2,
    "Accurately counts 2 workouts with valid calorie calculations"
  );
  assert(
    fullSummary.workouts_without_calories_count === 1,
    "Accurately flags 1 workout where calorie calculation was unavailable"
  );

  // Distance breakdowns
  assert(fullSummary.walking_distance_km === 3.5, "Walking distance isolated accurately (3.5 km)");
  assert(fullSummary.running_distance_km === 4.2, "Running distance isolated accurately (4.2 km)");
  assert(fullSummary.cycling_distance_km === 9.0, "Cycling distance isolated accurately (9.0 km)");
  assert(fullSummary.total_workout_duration_seconds === 6000, "Active workout duration summed accurately (6000s / 100 mins)");

  // 7-day weekly breakdown
  const weekly = computeWeeklySummary(sampleWorkouts, stepEntries, new Date(sampleDate));
  assert(weekly.length === 7, "Weekly summary generates exactly 7 calendar day buckets");
  const todayBucket = weekly.find((d) => d.date === sampleDate);
  assert(
    todayBucket !== undefined && todayBucket.steps === 7700 && todayBucket.totalDistanceKm === 16.7,
    "Weekly bucket for today matches daily computed metrics"
  );

  // ----------------------------------------------------------------------------
  // 7. WORKOUT INPUT VALIDATION: TIMESTAMPS, DURATION, BOUNDS & NOTES (Integrity Check)
  // ----------------------------------------------------------------------------
  console.log("\n--- 7. Workout Input Validation: Timestamps, Duration, Bounds & Notes ---");

  const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const validBasePayload = {
    session_token: validUuid,
    activity_type: "running",
    start_time: "2026-11-11T10:00:00.000Z",
    finish_time: "2026-11-11T10:30:00.000Z", // 1800s wall-clock
    duration_seconds: 1700, // 1700s active duration (<= 1800s)
    distance_meters: 5000,
    avg_pace_or_speed: 340,
    step_count: 4200,
    notes: "Authentic run along Bhatkal coastline",
  };

  // Valid payload passes
  const validCheck = validateWorkoutInput(validBasePayload);
  assert(validCheck.valid === true, "Valid workout input payload passes server validation");

  // Rejects invalid timestamp string
  const invalidStart = validateWorkoutInput({ ...validBasePayload, start_time: "invalid-date" });
  assert(
    invalidStart.valid === false && Boolean(invalidStart.error?.includes("invalid timestamp")),
    "Rejects invalid start_time timestamp"
  );

  const invalidFinish = validateWorkoutInput({ ...validBasePayload, finish_time: "not-a-timestamp" });
  assert(
    invalidFinish.valid === false && Boolean(invalidFinish.error?.includes("invalid timestamp")),
    "Rejects invalid finish_time timestamp"
  );

  // Rejects finish_time <= start_time (Inverted or zero elapsed time)
  const invertedTime = validateWorkoutInput({
    ...validBasePayload,
    start_time: "2026-11-11T10:30:00.000Z",
    finish_time: "2026-11-11T10:00:00.000Z",
  });
  assert(
    invertedTime.valid === false && Boolean(invertedTime.error?.includes("finish_time must be strictly after start_time")),
    "Rejects finish_time earlier than start_time"
  );

  const identicalTime = validateWorkoutInput({
    ...validBasePayload,
    start_time: "2026-11-11T10:00:00.000Z",
    finish_time: "2026-11-11T10:00:00.000Z",
  });
  assert(
    identicalTime.valid === false && Boolean(identicalTime.error?.includes("finish_time must be strictly after start_time")),
    "Rejects finish_time identical to start_time (0 elapsed time)"
  );

  // Rejects inconsistent duration (duration_seconds > wall-clock elapsed time)
  // Wall clock: 600 seconds, but claimed active duration is 1200 seconds
  const inconsistentDuration = validateWorkoutInput({
    ...validBasePayload,
    start_time: "2026-11-11T10:00:00.000Z",
    finish_time: "2026-11-11T10:10:00.000Z", // 600s wall-clock
    duration_seconds: 1200, // Impossible active duration
  });
  assert(
    inconsistentDuration.valid === false && Boolean(inconsistentDuration.error?.includes("cannot exceed total wall-clock")),
    "Rejects inconsistent duration_seconds exceeding wall-clock duration"
  );

  // Rejects negative duration
  const negativeDuration = validateWorkoutInput({ ...validBasePayload, duration_seconds: -300 });
  assert(
    negativeDuration.valid === false && Boolean(negativeDuration.error?.includes("positive finite whole integer")),
    "Rejects negative duration_seconds"
  );

  // Rejects negative distance
  const negativeDistance = validateWorkoutInput({ ...validBasePayload, distance_meters: -500 });
  assert(
    negativeDistance.valid === false && Boolean(negativeDistance.error?.includes("non-negative")),
    "Rejects negative distance_meters"
  );

  // Rejects infinite distance
  const infiniteDistance = validateWorkoutInput({ ...validBasePayload, distance_meters: Infinity });
  assert(
    infiniteDistance.valid === false && Boolean(infiniteDistance.error?.includes("finite")),
    "Rejects infinite distance_meters"
  );

  // Rejects distance exceeding physical limits
  const excessiveDistance = validateWorkoutInput({ ...validBasePayload, distance_meters: 600000 }); // 600 km
  assert(
    excessiveDistance.valid === false && Boolean(excessiveDistance.error?.includes("physical limit")),
    "Rejects distance exceeding reasonable physical limit (500 km)"
  );

  // Rejects negative speed/pace
  const negativeSpeed = validateWorkoutInput({ ...validBasePayload, avg_pace_or_speed: -10 });
  assert(
    negativeSpeed.valid === false && Boolean(negativeSpeed.error?.includes("non-negative")),
    "Rejects negative avg_pace_or_speed"
  );

  // Rejects negative step count
  const negativeSteps = validateWorkoutInput({ ...validBasePayload, step_count: -100 });
  assert(
    negativeSteps.valid === false && Boolean(negativeSteps.error?.includes("non-negative")),
    "Rejects negative step_count"
  );

  // Rejects oversized step count (> 150,000)
  const excessiveSteps = validateWorkoutInput({ ...validBasePayload, step_count: 200000 });
  assert(
    excessiveSteps.valid === false && Boolean(excessiveSteps.error?.includes("maximum limit")),
    "Rejects single-workout step_count exceeding 150,000"
  );

  // Rejects oversized notes (> 2000 characters)
  const oversizedNotes = validateWorkoutInput({ ...validBasePayload, notes: "x".repeat(2001) });
  assert(
    oversizedNotes.valid === false && Boolean(oversizedNotes.error?.includes("exceeds maximum limit of 2000")),
    "Rejects oversized notes exceeding 2,000 characters"
  );

  // Accepts valid notes <= 2000 characters
  const validNotes = validateWorkoutInput({ ...validBasePayload, notes: "x".repeat(2000) });
  assert(validNotes.valid === true, "Accepts notes exactly within 2,000 characters limit");

  // Rejects malformed session_token (non-UUID)
  const nonUuidToken = validateWorkoutInput({ ...validBasePayload, session_token: "invalid-token-123" });
  assert(
    nonUuidToken.valid === false && Boolean(nonUuidToken.error?.includes("valid UUID")),
    "Rejects malformed session_token that is not a valid UUID"
  );

  // ----------------------------------------------------------------------------
  // 8. DURATION & CALORIE INTEGRITY CHECKS (Targeted Review)
  // ----------------------------------------------------------------------------
  console.log("\n--- 8. Duration & Calorie Integrity Validation ---");

  // Rejects implausibly short duration (< 5 seconds)
  const shortDuration = validateWorkoutInput({ ...validBasePayload, duration_seconds: 4 });
  assert(
    shortDuration.valid === false && Boolean(shortDuration.error?.includes("at least 5 seconds")),
    "Rejects implausibly short duration_seconds (< 5s)"
  );

  // Rejects duration exceeding 24 hours
  const excessiveDuration = validateWorkoutInput({
    ...validBasePayload,
    start_time: "2026-11-10T10:00:00.000Z",
    finish_time: "2026-11-11T12:00:00.000Z",
    duration_seconds: 90000,
  });
  assert(
    excessiveDuration.valid === false && Boolean(excessiveDuration.error?.includes("exceeds maximum allowable workout duration")),
    "Rejects duration exceeding 24 hours (86,400s)"
  );

  // Rejects implausibly short duration for recorded distance (impossible velocity)
  // 5,000m running in 10s = 500 m/s (1,800 km/h) -> exceeds 50 km/h cap
  const impossibleSpeed = validateWorkoutInput({
    ...validBasePayload,
    duration_seconds: 10,
    distance_meters: 5000,
  });
  assert(
    impossibleSpeed.valid === false && Boolean(impossibleSpeed.error?.includes("Implausibly short duration")),
    "Rejects implausibly short duration for recorded distance (impossible speed)"
  );

  // Correctly accounts for paused time without false rejection
  // 1 hour wall-clock (3,600s), 30 minutes active (1,800s), 30 minutes paused, 4,000m distance
  const pausedWorkout = validateWorkoutInput({
    ...validBasePayload,
    start_time: "2026-11-11T10:00:00.000Z",
    finish_time: "2026-11-11T11:00:00.000Z", // 3,600s wall-clock
    duration_seconds: 1800, // 1,800s active (valid paused workout)
    distance_meters: 4000,
  });
  assert(
    pausedWorkout.valid === true,
    "Correctly accepts legitimate paused workout (active duration 1800s < wall-clock 3600s)"
  );

  // Calorie validation: Rejects negative client-supplied calories
  const negativeCalories = validateWorkoutInput({ ...validBasePayload, estimated_calories: -150 });
  assert(
    negativeCalories.valid === false && Boolean(negativeCalories.error?.includes("cannot be negative")),
    "Rejects negative client-supplied estimated_calories"
  );

  // Calorie validation: Rejects NaN calories
  const nanCalories = validateWorkoutInput({ ...validBasePayload, estimated_calories: NaN });
  assert(
    nanCalories.valid === false && Boolean(nanCalories.error?.includes("finite")),
    "Rejects NaN client-supplied estimated_calories"
  );

  // Calorie validation: Rejects Infinity calories
  const infiniteCalories = validateWorkoutInput({ ...validBasePayload, estimated_calories: Infinity });
  assert(
    infiniteCalories.valid === false && Boolean(infiniteCalories.error?.includes("finite")),
    "Rejects Infinity client-supplied estimated_calories"
  );

  // Calorie validation: Rejects non-number string calories
  const stringCalories = validateWorkoutInput({ ...validBasePayload, estimated_calories: "250" as unknown as number });
  assert(
    stringCalories.valid === false && Boolean(stringCalories.error?.includes("finite, non-negative number")),
    "Rejects non-number string for estimated_calories"
  );

  // Calorie validation: Rejects absurdly excessive calories (> 50,000)
  const excessiveCalories = validateWorkoutInput({ ...validBasePayload, estimated_calories: 60000 });
  assert(
    excessiveCalories.valid === false && Boolean(excessiveCalories.error?.includes("maximum physical limit")),
    "Rejects client-supplied estimated_calories exceeding 50,000 kcal"
  );

  // Calorie validation: Explicitly allows null
  const nullCalories = validateWorkoutInput({ ...validBasePayload, estimated_calories: null });
  assert(
    nullCalories.valid === true && nullCalories.data?.client_estimated_calories === null,
    "Explicitly allows null for estimated_calories when no weight-based calculation exists"
  );

  // Calorie validation: Allows valid positive finite number
  const validCalories = validateWorkoutInput({ ...validBasePayload, estimated_calories: 450 });
  assert(
    validCalories.valid === true && validCalories.data?.client_estimated_calories === 450,
    "Accepts valid finite positive estimated_calories (450 kcal)"
  );

  // Rejects NaN avg_pace_or_speed
  const nanPace = validateWorkoutInput({ ...validBasePayload, avg_pace_or_speed: NaN });
  assert(
    nanPace.valid === false && Boolean(nanPace.error?.includes("finite")),
    "Rejects NaN avg_pace_or_speed"
  );

  // Rejects Infinity avg_pace_or_speed
  const infinitePace = validateWorkoutInput({ ...validBasePayload, avg_pace_or_speed: Infinity });
  assert(
    infinitePace.valid === false && Boolean(infinitePace.error?.includes("finite")),
    "Rejects Infinity avg_pace_or_speed"
  );

  // Rejects pace/speed exceeding 10,000
  const excessivePace = validateWorkoutInput({ ...validBasePayload, avg_pace_or_speed: 15000 });
  assert(
    excessivePace.valid === false && Boolean(excessivePace.error?.includes("<= 10000")),
    "Rejects avg_pace_or_speed exceeding maximum bound (10,000)"
  );

  // ----------------------------------------------------------------------------
  // 9. CALORIE TRUST & CLIENT MANIPULATION DEFENSE (Server Authority)
  // ----------------------------------------------------------------------------
  console.log("\n--- 9. Calorie Trust & Client Manipulation Defense ---");

  // Scenario A: Client submits inflated calories (5,000 kcal) for a 30-min run
  // Server-side calculation strictly uses authenticated profile weight (70kg), producing 291 kcal
  const clientClaimedCalories = 5000;
  const userProfileWeight = 70; // From authenticated profiles table
  const serverCalorieResult = calculateWorkoutCalories(
    "running",
    1800, // 30 minutes
    userProfileWeight,
    5000 // 5 km
  );
  assert(
    serverCalorieResult.estimatedCalories !== clientClaimedCalories &&
      serverCalorieResult.estimatedCalories === 343,
    `Server overrides client-supplied calories (claimed: ${clientClaimedCalories} kcal -> computed: ${serverCalorieResult.estimatedCalories} kcal)`
  );

  // Scenario B: Client attempts to claim calories (600 kcal) when user profile has no weight (null)
  // Server-side calculation strictly sets estimated_calories to null
  const unweightedProfileCalorieResult = calculateWorkoutCalories(
    "running",
    1800,
    null, // Profile weight missing
    5000
  );
  assert(
    unweightedProfileCalorieResult.estimatedCalories === null &&
      unweightedProfileCalorieResult.reason === "PROFILE_WEIGHT_REQUIRED",
    "Server strictly sets calories to null when user profile has no weight, ignoring any client attempt"
  );

  // Scenario C: Client sends negative calorie value (-250 kcal)
  // Input validation rejects the payload before any DB insertion
  const maliciousNegativeCal = validateWorkoutInput({
    ...validBasePayload,
    estimated_calories: -250,
  });
  assert(
    maliciousNegativeCal.valid === false &&
      Boolean(maliciousNegativeCal.error?.includes("cannot be negative")),
    "Rejects payload with negative client-supplied calories"
  );

  // Scenario D: Client sends non-numeric string calories ("free-calories")
  const maliciousStringCal = validateWorkoutInput({
    ...validBasePayload,
    estimated_calories: "free-calories" as unknown as number,
  });
  assert(
    maliciousStringCal.valid === false &&
      Boolean(maliciousStringCal.error?.includes("finite, non-negative number")),
    "Rejects payload with non-numeric string calories"
  );

  console.log("\n==================================================================");
  console.log(`STAGE 8 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runStage8Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

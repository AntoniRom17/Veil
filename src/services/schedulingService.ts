import type {
  RoutineSchedule,
  RoutineWithDetails,
  VeilPreferences,
} from "@/src/types/domain";
import {
  calendarDayDifference,
  resolveRoutinePeriod,
  toLocalDateKey,
} from "@/src/utils/dates";

export function scheduleMatchesDate(schedule: RoutineSchedule | undefined, date: Date): boolean {
  if (!schedule?.enabled) return false;
  switch (schedule.kind) {
    case "daily":
      return true;
    case "weekdays":
      return schedule.weekdays.includes(date.getDay());
    case "interval": {
      if (!schedule.anchorDate || !schedule.intervalDays || schedule.intervalDays < 1) return false;
      const elapsed = calendarDayDifference(toLocalDateKey(date), schedule.anchorDate);
      return elapsed >= 0 && elapsed % schedule.intervalDays === 0;
    }
    case "manual":
      return false;
  }
}

export function selectScheduledRoutines(
  routines: RoutineWithDetails[],
  date: Date,
  period: "am" | "pm",
): RoutineWithDetails[] {
  return routines
    .filter((routine) => !routine.archived)
    .filter((routine) => routine.period === period || routine.period === "anytime")
    .filter((routine) => scheduleMatchesDate(routine.schedule, date))
    .sort((left, right) => left.priority - right.priority || left.createdAt.localeCompare(right.createdAt));
}

export interface TodaySelection {
  period: "am" | "pm";
  primary?: RoutineWithDetails;
  alternatives: RoutineWithDetails[];
}

export function selectTodayRoutine(
  routines: RoutineWithDetails[],
  preferences: VeilPreferences,
  date: Date,
  manualPeriod?: "am" | "pm",
): TodaySelection {
  const period =
    manualPeriod ??
    (preferences.defaultTodayView === "automatic"
      ? resolveRoutinePeriod(date, preferences.morningStart, preferences.eveningStart)
      : preferences.defaultTodayView);
  const matching = selectScheduledRoutines(routines, date, period);
  return {
    period,
    primary: matching[0],
    alternatives: matching.slice(1),
  };
}

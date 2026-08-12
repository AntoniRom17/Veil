import { describe, expect, it } from "vitest";
import type { RoutineSchedule, RoutineWithDetails, VeilPreferences } from "@/src/types/domain";
import { createDefaultPreferences } from "@/src/lib/constants";
import { resolveRoutinePeriod } from "@/src/utils/dates";
import { scheduleMatchesDate, selectTodayRoutine } from "@/src/services/schedulingService";

function schedule(changes: Partial<RoutineSchedule>): RoutineSchedule {
  return { id: crypto.randomUUID(), routineId: "routine", kind: "daily", weekdays: [], enabled: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ...changes };
}

function routine(period: "am" | "pm", priority: number, routineSchedule: RoutineSchedule): RoutineWithDetails {
  return { id: crypto.randomUUID(), name: `${period} routine`, period, notes: "", favorite: false, archived: false, priority, steps: [], schedule: routineSchedule, createdAt: `2026-01-0${priority + 1}T00:00:00.000Z`, updatedAt: "2026-01-01T00:00:00.000Z" };
}

describe("routine scheduling", () => {
  it("matches daily schedules", () => {
    expect(scheduleMatchesDate(schedule({ kind: "daily" }), new Date(2026, 7, 12))).toBe(true);
  });

  it("matches selected weekdays in local time", () => {
    const monday = new Date(2026, 7, 10, 12);
    expect(scheduleMatchesDate(schedule({ kind: "weekdays", weekdays: [1, 3, 5] }), monday)).toBe(true);
    expect(scheduleMatchesDate(schedule({ kind: "weekdays", weekdays: [2] }), monday)).toBe(false);
  });

  it("matches positive interval offsets and not dates before the anchor", () => {
    const interval = schedule({ kind: "interval", intervalDays: 3, anchorDate: "2026-08-01" });
    expect(scheduleMatchesDate(interval, new Date(2026, 7, 10))).toBe(true);
    expect(scheduleMatchesDate(interval, new Date(2026, 7, 9))).toBe(false);
    expect(scheduleMatchesDate(interval, new Date(2026, 6, 29))).toBe(false);
  });

  it("keeps manual schedules out of automatic selection", () => {
    expect(scheduleMatchesDate(schedule({ kind: "manual" }), new Date(2026, 7, 12))).toBe(false);
  });

  it("uses stable priority when multiple routines match", () => {
    const prefs: VeilPreferences = createDefaultPreferences(new Date("2026-01-01T00:00:00.000Z"));
    const later = routine("am", 4, schedule({ routineId: "later" }));
    const first = routine("am", 1, schedule({ routineId: "first" }));
    const result = selectTodayRoutine([later, first], prefs, new Date(2026, 7, 12, 9));
    expect(result.primary?.id).toBe(first.id);
    expect(result.alternatives).toHaveLength(1);
  });
});

describe("AM and PM selection", () => {
  it("selects AM inside configurable daytime boundaries", () => {
    expect(resolveRoutinePeriod(new Date(2026, 7, 12, 8, 30), "05:00", "17:00")).toBe("am");
    expect(resolveRoutinePeriod(new Date(2026, 7, 12, 19, 30), "05:00", "17:00")).toBe("pm");
  });

  it("supports manual period switching without locking either routine", () => {
    const prefs = createDefaultPreferences(new Date("2026-01-01T00:00:00.000Z"));
    const am = routine("am", 0, schedule({ routineId: "am" }));
    const pm = routine("pm", 1, schedule({ routineId: "pm" }));
    expect(selectTodayRoutine([am, pm], prefs, new Date(2026, 7, 12, 9), "pm").primary?.id).toBe(pm.id);
  });
});

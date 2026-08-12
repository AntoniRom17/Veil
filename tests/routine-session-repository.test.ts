import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VeilDatabase } from "@/src/db/VeilDatabase";
import { RoutineRepository } from "@/src/repositories/routineRepository";
import { SessionRepository } from "@/src/repositories/sessionRepository";
import { createTestDatabase, destroyTestDatabase } from "./helpers/database";

describe("routine and session persistence", () => {
  let db: VeilDatabase;
  let routines: RoutineRepository;
  let sessions: SessionRepository;

  beforeEach(async () => {
    db = await createTestDatabase("sessions");
    routines = new RoutineRepository(db);
    sessions = new SessionRepository(db);
  });

  afterEach(async () => destroyTestDatabase(db));

  it("persists ordered steps and a schedule transactionally", async () => {
    const routine = await routines.create(
      { name: "Evening", period: "pm", notes: "", favorite: false, archived: false, priority: 0 },
      [
        { order: 0, name: "Cleanse", categoryName: "Cleanser", instructions: "", amountGuidance: "", notes: "", required: true },
        { order: 1, name: "Moisturize", categoryName: "Moisturizer", instructions: "", amountGuidance: "", notes: "", required: true },
      ],
      { kind: "weekdays", weekdays: [1, 3, 5], enabled: true },
    );
    expect(routine.steps.map((step) => step.name)).toEqual(["Cleanse", "Moisturize"]);
    expect(routine.schedule?.weekdays).toEqual([1, 3, 5]);
  });

  it("records completion, skipping, undo, and session status", async () => {
    const routine = await routines.create(
      { name: "Morning", period: "am", notes: "", favorite: false, archived: false, priority: 0 },
      [
        { order: 0, name: "Cleanse", categoryName: "Cleanser", instructions: "", amountGuidance: "", notes: "", required: true },
        { order: 1, name: "Protect", categoryName: "Sunscreen", instructions: "", amountGuidance: "", notes: "", required: true },
      ],
      { kind: "daily", weekdays: [], enabled: true },
    );
    let session = await sessions.getOrCreate(routine, new Date(2026, 7, 12, 8));
    session = await sessions.setStepState(session.id, session.steps[0].id, "complete");
    expect(session).toMatchObject({ completedCount: 1, skippedCount: 0, status: "in-progress" });
    session = await sessions.setStepState(session.id, session.steps[1].id, "skipped");
    expect(session.status).toBe("complete");
    expect(session.completedAt).toBeDefined();
    session = await sessions.setStepState(session.id, session.steps[1].id, "pending");
    expect(session.status).toBe("in-progress");
    expect(session.completedAt).toBeUndefined();
  });

  it("keeps immutable session snapshots after deleting the routine", async () => {
    const routine = await routines.create(
      { name: "Travel", period: "anytime", notes: "", favorite: false, archived: false, priority: 0 },
      [{ order: 0, name: "Moisturize", categoryName: "Moisturizer", instructions: "", amountGuidance: "", notes: "", required: true }],
      { kind: "manual", weekdays: [], enabled: true },
    );
    const session = await sessions.getOrCreate(routine, new Date(2026, 7, 12, 14));
    await routines.remove(routine.id);
    expect(await sessions.get(session.id)).toMatchObject({ routineName: "Travel", steps: [{ name: "Moisturize" }] });
  });
});

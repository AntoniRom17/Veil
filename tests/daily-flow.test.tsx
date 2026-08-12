import Dexie from "dexie";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeDatabase, getDatabase, openDatabase } from "@/src/db/VeilDatabase";
import { DATABASE_NAME } from "@/src/lib/constants";
import { RoutineRepository } from "@/src/repositories/routineRepository";
import { Onboarding } from "@/src/features/onboarding/Onboarding";
import { TodayScreen } from "@/src/features/today/TodayScreen";

beforeEach(async () => {
  await closeDatabase();
  await Dexie.delete(DATABASE_NAME);
  await openDatabase();
});

afterEach(async () => {
  await closeDatabase();
  await Dexie.delete(DATABASE_NAME);
});

describe("first launch and the daily loop", () => {
  it("completes onboarding and creates the chosen starter routines", async () => {
    const user = userEvent.setup();
    const complete = vi.fn();
    render(<Onboarding onComplete={complete} />);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("radio", { name: /both/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: /open today/i }));
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
    const routines = await getDatabase().routines.orderBy("priority").toArray();
    expect(routines.map((routine) => routine.name)).toEqual(["Morning Routine", "Evening Routine"]);
  });

  it("shows the next step, persists completion, skipping, and saved history", async () => {
    const repository = new RoutineRepository(getDatabase());
    await repository.create(
      { name: "Daily Calm", period: "anytime", notes: "", favorite: true, archived: false, priority: 0 },
      [
        { order: 0, name: "Cleanse", categoryName: "Cleanser", instructions: "Rinse gently.", amountGuidance: "A small amount", notes: "", required: true },
        { order: 1, name: "Moisturize", categoryName: "Moisturizer", instructions: "", amountGuidance: "", notes: "", required: true },
      ],
      { kind: "daily", weekdays: [], enabled: true },
    );
    render(<TodayScreen onOpenRoutines={vi.fn()} onOpenProducts={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "Daily Calm" })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Complete Cleanse" }));
    expect(await screen.findByText(/1 of 2 complete/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    expect(await screen.findByText(/routine complete/i)).toBeInTheDocument();
    const sessions = await getDatabase().routineSessions.toArray();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ completedCount: 1, skippedCount: 1, status: "complete" });
  });
});

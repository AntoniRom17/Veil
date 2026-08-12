import type { VeilDatabase } from "@/src/db/VeilDatabase";
import type {
  Routine,
  RoutineSchedule,
  RoutineStep,
  RoutineWithDetails,
} from "@/src/types/domain";
import { VeilError } from "@/src/utils/errors";
import { createId } from "@/src/utils/id";

export type RoutineDraft = Omit<Routine, "id" | "createdAt" | "updatedAt">;
export type StepDraft = Omit<RoutineStep, "id" | "routineId" | "createdAt" | "updatedAt">;
export type ScheduleDraft = Omit<
  RoutineSchedule,
  "id" | "routineId" | "createdAt" | "updatedAt"
>;

export class RoutineRepository {
  constructor(private readonly db: VeilDatabase) {}

  async list(): Promise<RoutineWithDetails[]> {
    const routines = await this.db.routines.toArray();
    return Promise.all(
      routines
        .filter((routine) => !routine.archived)
        .sort((left, right) => left.priority - right.priority || left.name.localeCompare(right.name))
        .map((routine) => this.attachDetails(routine)),
    );
  }

  async get(id: string): Promise<RoutineWithDetails | undefined> {
    const routine = await this.db.routines.get(id);
    return routine ? this.attachDetails(routine) : undefined;
  }

  async create(
    draft: RoutineDraft,
    steps: StepDraft[] = [],
    schedule?: ScheduleDraft,
  ): Promise<RoutineWithDetails> {
    if (!draft.name.trim()) {
      throw new VeilError("Give this routine a name before saving.", "ROUTINE_NAME_REQUIRED");
    }
    const timestamp = new Date().toISOString();
    const routine: Routine = {
      ...draft,
      name: draft.name.trim(),
      id: createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const persistedSteps = steps.map((step, order): RoutineStep => ({
      ...step,
      id: createId(),
      routineId: routine.id,
      order,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    const persistedSchedule: RoutineSchedule | undefined = schedule
      ? {
          ...schedule,
          id: createId(),
          routineId: routine.id,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
      : undefined;

    await this.db.transaction(
      "rw",
      [this.db.routines, this.db.routineSteps, this.db.routineSchedules],
      async () => {
        await this.db.routines.add(routine);
        if (persistedSteps.length) await this.db.routineSteps.bulkAdd(persistedSteps);
        if (persistedSchedule) await this.db.routineSchedules.add(persistedSchedule);
      },
    );

    return { ...routine, steps: persistedSteps, schedule: persistedSchedule };
  }

  async update(
    id: string,
    changes: Partial<RoutineDraft>,
    steps?: StepDraft[],
    schedule?: ScheduleDraft,
  ): Promise<RoutineWithDetails> {
    const existing = await this.require(id);
    const updated: Routine = {
      ...existing,
      ...changes,
      name: (changes.name ?? existing.name).trim(),
      id,
      updatedAt: new Date().toISOString(),
    };
    if (!updated.name) {
      throw new VeilError("Give this routine a name before saving.", "ROUTINE_NAME_REQUIRED");
    }

    await this.db.transaction(
      "rw",
      [this.db.routines, this.db.routineSteps, this.db.routineSchedules],
      async () => {
        await this.db.routines.put(updated);
        if (steps) {
          const timestamp = new Date().toISOString();
          await this.db.routineSteps.where("routineId").equals(id).delete();
          await this.db.routineSteps.bulkAdd(
            steps.map((step, order) => ({
              ...step,
              id: createId(),
              routineId: id,
              order,
              createdAt: timestamp,
              updatedAt: timestamp,
            })),
          );
        }
        if (schedule) {
          const current = await this.db.routineSchedules.where("routineId").equals(id).first();
          const timestamp = new Date().toISOString();
          await this.db.routineSchedules.put({
            ...schedule,
            id: current?.id ?? createId(),
            routineId: id,
            createdAt: current?.createdAt ?? timestamp,
            updatedAt: timestamp,
          });
        }
      },
    );

    return (await this.get(id))!;
  }

  async toggleFavorite(id: string): Promise<RoutineWithDetails> {
    const routine = await this.require(id);
    return this.update(id, { favorite: !routine.favorite });
  }

  async duplicate(id: string): Promise<RoutineWithDetails> {
    const source = await this.require(id);
    const { steps, schedule, id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...draft } = source;
    void _id;
    void _createdAt;
    void _updatedAt;
    const stepDrafts = steps.map(({ id: _stepId, routineId: _routineId, createdAt, updatedAt, ...step }) => {
      void _stepId;
      void _routineId;
      void createdAt;
      void updatedAt;
      return step;
    });
    const scheduleDraft = schedule
      ? (({ id: _scheduleId, routineId: _routineId, createdAt, updatedAt, ...rest }) => {
          void _scheduleId;
          void _routineId;
          void createdAt;
          void updatedAt;
          return rest;
        })(schedule)
      : undefined;
    return this.create(
      { ...draft, name: `${source.name} copy`, favorite: false, priority: source.priority + 1 },
      stepDrafts,
      scheduleDraft,
    );
  }

  async remove(id: string): Promise<void> {
    await this.require(id);
    await this.db.transaction(
      "rw",
      [this.db.routines, this.db.routineSteps, this.db.routineSchedules],
      async () => {
        await Promise.all([
          this.db.routineSteps.where("routineId").equals(id).delete(),
          this.db.routineSchedules.where("routineId").equals(id).delete(),
          this.db.routines.delete(id),
        ]);
      },
    );
  }

  private async require(id: string): Promise<RoutineWithDetails> {
    const routine = await this.get(id);
    if (!routine) throw new VeilError("That routine no longer exists.", "ROUTINE_NOT_FOUND");
    return routine;
  }

  private async attachDetails(routine: Routine): Promise<RoutineWithDetails> {
    const [steps, schedule] = await Promise.all([
      this.db.routineSteps.where("routineId").equals(routine.id).sortBy("order"),
      this.db.routineSchedules.where("routineId").equals(routine.id).first(),
    ]);
    return { ...routine, steps, schedule };
  }
}

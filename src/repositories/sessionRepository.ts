import type { VeilDatabase } from "@/src/db/VeilDatabase";
import type {
  Product,
  RoutineWithDetails,
  SessionStep,
  SessionStepState,
  SessionWithSteps,
} from "@/src/types/domain";
import { toLocalDateKey } from "@/src/utils/dates";
import { VeilError } from "@/src/utils/errors";
import { createId } from "@/src/utils/id";

export class SessionRepository {
  constructor(private readonly db: VeilDatabase) {}

  async list(limit?: number): Promise<SessionWithSteps[]> {
    const sessions = await this.db.routineSessions.orderBy("startedAt").reverse().toArray();
    const selected = limit ? sessions.slice(0, limit) : sessions;
    return Promise.all(selected.map((session) => this.attachSteps(session)));
  }

  async get(id: string): Promise<SessionWithSteps | undefined> {
    const session = await this.db.routineSessions.get(id);
    return session ? this.attachSteps(session) : undefined;
  }

  async getOrCreate(
    routine: RoutineWithDetails,
    date = new Date(),
  ): Promise<SessionWithSteps> {
    const localDate = toLocalDateKey(date);
    const existing = await this.db.routineSessions
      .where("[localDate+period]")
      .equals([localDate, routine.period])
      .filter((session) => session.routineId === routine.id && session.status === "in-progress")
      .first();
    if (existing) return this.attachSteps(existing);

    const timestamp = date.toISOString();
    const products = await this.loadProducts(routine.steps.flatMap((step) => step.productId ?? []));
    const sessionId = createId();
    const sessionSteps: SessionStep[] = routine.steps.map((step) => ({
      id: createId(),
      sessionId,
      sourceStepId: step.id,
      order: step.order,
      name: step.name,
      productId: step.productId,
      productName: step.productId ? products.get(step.productId)?.name : undefined,
      categoryName: step.categoryName,
      instructions: step.instructions,
      waitSeconds: step.waitSeconds,
      amountGuidance: step.amountGuidance,
      required: step.required,
      state: "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    const session: SessionWithSteps = {
      id: sessionId,
      routineId: routine.id,
      routineName: routine.name,
      period: routine.period,
      localDate,
      startedAt: timestamp,
      status: "in-progress",
      completedCount: 0,
      skippedCount: 0,
      totalCount: sessionSteps.length,
      productIds: [...new Set(sessionSteps.flatMap((step) => step.productId ?? []))],
      notes: "",
      createdAt: timestamp,
      updatedAt: timestamp,
      steps: sessionSteps,
    };

    await this.db.transaction("rw", [this.db.routineSessions, this.db.sessionSteps], async () => {
      const { steps, ...record } = session;
      await this.db.routineSessions.add(record);
      if (steps.length) await this.db.sessionSteps.bulkAdd(steps);
    });
    return session;
  }

  async setStepState(
    sessionId: string,
    stepId: string,
    state: SessionStepState,
  ): Promise<SessionWithSteps> {
    const session = await this.require(sessionId);
    const step = session.steps.find((item) => item.id === stepId);
    if (!step) throw new VeilError("That routine step no longer exists.", "SESSION_STEP_NOT_FOUND");
    const timestamp = new Date().toISOString();
    const updatedStep: SessionStep = {
      ...step,
      state,
      resolvedAt: state === "pending" ? undefined : timestamp,
      updatedAt: timestamp,
    };
    const steps = session.steps.map((item) => (item.id === stepId ? updatedStep : item));
    const completedCount = steps.filter((item) => item.state === "complete").length;
    const skippedCount = steps.filter((item) => item.state === "skipped").length;
    const isResolved = completedCount + skippedCount === session.totalCount && session.totalCount > 0;
    const updatedSession = {
      ...session,
      status: isResolved ? ("complete" as const) : ("in-progress" as const),
      completedAt: isResolved ? session.completedAt ?? timestamp : undefined,
      completedCount,
      skippedCount,
      updatedAt: timestamp,
    };
    const { steps: _steps, ...record } = updatedSession;
    void _steps;
    await this.db.transaction("rw", [this.db.routineSessions, this.db.sessionSteps], async () => {
      await this.db.sessionSteps.put(updatedStep);
      await this.db.routineSessions.put(record);
    });
    return { ...record, steps };
  }

  async updateNotes(sessionId: string, notes: string): Promise<SessionWithSteps> {
    const session = await this.require(sessionId);
    const updatedAt = new Date().toISOString();
    await this.db.routineSessions.update(sessionId, { notes: notes.trim(), updatedAt });
    return { ...session, notes: notes.trim(), updatedAt };
  }

  private async require(id: string): Promise<SessionWithSteps> {
    const session = await this.get(id);
    if (!session) throw new VeilError("That routine session no longer exists.", "SESSION_NOT_FOUND");
    return session;
  }

  private async attachSteps(
    session: Omit<SessionWithSteps, "steps">,
  ): Promise<SessionWithSteps> {
    const steps = await this.db.sessionSteps.where("sessionId").equals(session.id).sortBy("order");
    return { ...session, steps };
  }

  private async loadProducts(ids: string[]): Promise<Map<string, Product>> {
    const products = await this.db.products.bulkGet([...new Set(ids)]);
    return new Map(products.filter((product): product is Product => Boolean(product)).map((product) => [product.id, product]));
  }
}

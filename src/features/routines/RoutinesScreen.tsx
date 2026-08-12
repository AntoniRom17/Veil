import { CalendarDays, Clock3, Copy, Heart, MoreHorizontal, Plus, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/src/components/common/Button";
import { ConfirmDialog } from "@/src/components/common/ConfirmDialog";
import { EmptyState } from "@/src/components/common/EmptyState";
import { IconButton } from "@/src/components/common/IconButton";
import { Sheet } from "@/src/components/common/Sheet";
import { ScreenHeader } from "@/src/components/navigation/ScreenHeader";
import { getDatabase } from "@/src/db/VeilDatabase";
import { RoutineRepository } from "@/src/repositories/routineRepository";
import type { RoutineWithDetails } from "@/src/types/domain";
import { toUserMessage } from "@/src/utils/errors";
import { RoutineForm, type RoutineFormValue } from "./RoutineForm";

function scheduleLabel(routine: RoutineWithDetails): string {
  const schedule = routine.schedule;
  if (!schedule) return "Not scheduled";
  if (schedule.kind === "daily") return "Every day";
  if (schedule.kind === "manual") return "As needed";
  if (schedule.kind === "interval") return `Every ${schedule.intervalDays ?? 1} days`;
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return schedule.weekdays.map((day) => labels[day]).join(" · ");
}

export function RoutinesScreen() {
  const db = getDatabase();
  const repository = useMemo(() => new RoutineRepository(db), [db]);
  const routines = useLiveQuery(() => repository.list(), [repository], []);
  const products = useLiveQuery(() => db.products.toArray(), [db], []);
  const categories = useLiveQuery(() => db.categories.orderBy("order").toArray(), [db], []);
  const [editing, setEditing] = useState<RoutineWithDetails | "new" | null>(null);
  const [actions, setActions] = useState<RoutineWithDetails | null>(null);
  const [deleting, setDeleting] = useState<RoutineWithDetails | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function saveRoutine(value: RoutineFormValue) {
    setBusy(true);
    try {
      const { steps, schedule, ...draft } = value;
      if (editing && editing !== "new") await repository.update(editing.id, draft, steps, schedule);
      else await repository.create(draft, steps, schedule);
      setEditing(null);
      setMessage(editing === "new" ? "Routine created." : "Routine saved.");
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function perform(action: "favorite" | "duplicate") {
    if (!actions) return;
    setBusy(true);
    try {
      if (action === "favorite") await repository.toggleFavorite(actions.id);
      else await repository.duplicate(actions.id);
      setMessage(action === "favorite" ? "Favorite updated." : "Routine duplicated.");
      setActions(null);
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await repository.remove(deleting.id);
      setMessage("Routine deleted. Past history remains intact.");
      setDeleting(null);
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <ScreenHeader eyebrow="Your rhythm" title="Routines" description="Build the steps that make your skincare feel automatic." action={<IconButton label="Create routine" tone="accent" onClick={() => setEditing("new")}><Plus size={21} /></IconButton>} />
      {message ? <div className="status-banner" role="status"><span>{message}</span><button type="button" onClick={() => setMessage("")}>Dismiss</button></div> : null}
      {!routines.length ? (
        <EmptyState icon={<CalendarDays size={26} />} title="Build your first routine." description="Start with a calm morning or evening ritual, then schedule it for the days that suit you." action={<Button leadingIcon={<Plus size={18} />} onClick={() => setEditing("new")}>New routine</Button>} />
      ) : (
        <div className="routine-list">
          {routines.map((routine) => (
            <article className="routine-card" key={routine.id}>
              <button type="button" className="routine-card__main" onClick={() => setEditing(routine)}>
                <span className={`routine-card__period routine-card__period--${routine.period}`}>{routine.period === "am" ? "AM" : routine.period === "pm" ? "PM" : "ANY"}</span>
                <span className="routine-card__copy"><span className="routine-card__title">{routine.name}{routine.favorite ? <Heart size={14} fill="currentColor" aria-label="Favorite" /> : null}</span><span className="routine-card__meta"><span><Sparkles size={14} /> {routine.steps.length} steps</span><span><Clock3 size={14} /> {scheduleLabel(routine)}</span></span></span>
              </button>
              <IconButton label={`More actions for ${routine.name}`} onClick={() => setActions(routine)}><MoreHorizontal size={20} /></IconButton>
            </article>
          ))}
        </div>
      )}
      {editing ? <RoutineForm key={editing === "new" ? "new" : editing.id} open routine={editing !== "new" ? editing : undefined} products={products} categories={categories} busy={busy} onClose={() => setEditing(null)} onSave={saveRoutine} /> : null}
      <Sheet open={Boolean(actions)} title={actions?.name ?? "Routine actions"} onClose={() => setActions(null)}>
        <div className="action-list">
          <button type="button" onClick={() => perform("favorite")}><Heart size={19} /><span>{actions?.favorite ? "Remove from favorites" : "Add to favorites"}</span></button>
          <button type="button" onClick={() => perform("duplicate")}><Copy size={19} /><span>Duplicate routine</span></button>
          <button type="button" className="action-list__danger" onClick={() => { setDeleting(actions); setActions(null); }}><Trash2 size={19} /><span>Delete routine</span></button>
        </div>
      </Sheet>
      <ConfirmDialog open={Boolean(deleting)} title="Delete this routine?" description="The routine and its schedule will be removed. Completed history keeps its saved snapshot." confirmLabel="Delete routine" onClose={() => setDeleting(null)} onConfirm={remove} busy={busy} />
    </div>
  );
}

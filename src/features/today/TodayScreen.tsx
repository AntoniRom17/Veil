import { Check, CheckCircle2, ChevronDown, Circle, Clock3, FileText, Forward, PackageOpen, Plus, RotateCcw, SkipForward, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/src/components/common/Button";
import { EmptyState } from "@/src/components/common/EmptyState";
import { IconButton } from "@/src/components/common/IconButton";
import { SegmentedControl } from "@/src/components/common/SegmentedControl";
import { Sheet } from "@/src/components/common/Sheet";
import { TextAreaField } from "@/src/components/forms/Field";
import { ScreenHeader } from "@/src/components/navigation/ScreenHeader";
import { getDatabase } from "@/src/db/VeilDatabase";
import { NotesRepository } from "@/src/repositories/notesRepository";
import { RoutineRepository } from "@/src/repositories/routineRepository";
import { SessionRepository } from "@/src/repositories/sessionRepository";
import { selectTodayRoutine } from "@/src/services/schedulingService";
import type { RoutineWithDetails, SessionStepState } from "@/src/types/domain";
import { createDefaultPreferences } from "@/src/lib/constants";
import { formatCalendarDate, formatClockTime, resolveRoutinePeriod, toLocalDateKey } from "@/src/utils/dates";
import { toUserMessage } from "@/src/utils/errors";

interface TodayScreenProps {
  onOpenRoutines(): void;
  onOpenProducts(): void;
}

export function TodayScreen({ onOpenRoutines, onOpenProducts }: TodayScreenProps) {
  const db = getDatabase();
  const routineRepository = useMemo(() => new RoutineRepository(db), [db]);
  const sessionRepository = useMemo(() => new SessionRepository(db), [db]);
  const notesRepository = useMemo(() => new NotesRepository(db), [db]);
  const routines = useLiveQuery(() => routineRepository.list(), [routineRepository], []);
  const preferences = useLiveQuery(() => db.preferences.get("preferences"), [db]);
  const todayNotes = useLiveQuery(() => notesRepository.list(toLocalDateKey(new Date())), [notesRepository], []);
  const [manualPeriod, setManualPeriod] = useState<"am" | "pm" | undefined>();
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>();
  const [sessionId, setSessionId] = useState<string>();
  const session = useLiveQuery(() => sessionId ? sessionRepository.get(sessionId) : undefined, [sessionId, sessionRepository]);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busyStep, setBusyStep] = useState<string>();
  const [message, setMessage] = useState("");

  const now = new Date();
  const resolvedPreferences = preferences ?? createDefaultPreferences(now);
  const automaticPeriod = resolveRoutinePeriod(now, resolvedPreferences.morningStart, resolvedPreferences.eveningStart);
  const selection = selectTodayRoutine(routines, resolvedPreferences, now, manualPeriod);
  const availableForPeriod = routines.filter((routine) => routine.period === selection.period || routine.period === "anytime");
  const selectedRoutine = availableForPeriod.find((routine) => routine.id === selectedRoutineId);
  const activeRoutine: RoutineWithDetails | undefined = selectedRoutine ?? selection.primary ?? availableForPeriod[0];

  useEffect(() => {
    let cancelled = false;
    if (!activeRoutine) {
      return;
    }
    sessionRepository
      .getOrCreate(activeRoutine)
      .then((created) => {
        if (!cancelled) setSessionId(created.id);
      })
      .catch((error: unknown) => {
        if (!cancelled) setMessage(toUserMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [activeRoutine, sessionRepository]);

  async function setStepState(stepId: string, state: SessionStepState) {
    if (!sessionId) return;
    setBusyStep(stepId);
    try {
      await sessionRepository.setStepState(sessionId, stepId, state);
    } catch (error) {
      setMessage(toUserMessage(error));
    } finally {
      setBusyStep(undefined);
    }
  }

  async function saveNote() {
    try {
      await notesRepository.create(note, sessionId);
      setNote("");
      setNoteOpen(false);
      setMessage("Note saved to today.");
    } catch (error) {
      setMessage(toUserMessage(error));
    }
  }

  const progress = session?.totalCount ? (session.completedCount + session.skippedCount) / session.totalCount : 0;

  return (
    <div className="screen screen--today">
      <ScreenHeader eyebrow={formatCalendarDate(now)} title="Today" description={selection.period === automaticPeriod ? "Right now, made simple." : "Viewing a different time of day."} action={<IconButton label="Add quick note" tone="accent" onClick={() => setNoteOpen(true)}><Plus size={21} /></IconButton>} />
      <SegmentedControl<"am" | "pm"> value={selection.period} onChange={(period) => { setManualPeriod(period); setSelectedRoutineId(undefined); }} label="Today routine period" segments={[{ value: "am", label: "Morning" }, { value: "pm", label: "Evening" }]} />
      {message ? <div className="status-banner today-message" role="status"><span>{message}</span><button type="button" onClick={() => setMessage("")}>Dismiss</button></div> : null}
      {!activeRoutine ? (
        <EmptyState icon={<Sparkles size={26} />} title="Nothing is scheduled yet." description={`Create a ${selection.period === "am" ? "morning" : "evening"} routine and Veil will bring it here automatically.`} action={<Button onClick={onOpenRoutines}>Create a routine</Button>} />
      ) : (
        <>
          <section className="today-hero">
            <div className="today-hero__top">
              <div><p className="today-hero__eyebrow">{selection.period === "am" ? "Morning ritual" : "Evening ritual"}</p><h2>{activeRoutine.name}</h2></div>
              {availableForPeriod.length > 1 ? <label className="routine-select"><span className="sr-only">Choose routine</span><select value={activeRoutine.id} onChange={(event) => setSelectedRoutineId(event.target.value)}>{availableForPeriod.map((routine) => <option value={routine.id} key={routine.id}>{routine.name}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label> : null}
            </div>
            <div className="today-progress" aria-label={`${session?.completedCount ?? 0} of ${session?.totalCount ?? activeRoutine.steps.length} steps complete`}>
              <div className="today-progress__track"><span style={{ width: `${progress * 100}%` }} /></div>
              <p>{session?.status === "complete" ? <><CheckCircle2 size={15} /> Routine complete</> : <>{session?.completedCount ?? 0} of {session?.totalCount ?? activeRoutine.steps.length} complete{session?.skippedCount ? ` · ${session.skippedCount} skipped` : ""}</>}</p>
            </div>
          </section>
          <ol className="today-steps">
            {(session?.steps ?? []).map((step, index) => {
              const resolved = step.state !== "pending";
              return (
                <li className={`today-step today-step--${step.state}`} key={step.id}>
                  <button type="button" className="today-step__check" aria-label={step.state === "complete" ? `Undo ${step.name}` : `Complete ${step.name}`} onClick={() => setStepState(step.id, step.state === "complete" ? "pending" : "complete")} disabled={busyStep === step.id}>
                    {step.state === "complete" ? <Check size={20} /> : step.state === "skipped" ? <Forward size={19} /> : <Circle size={20} />}
                  </button>
                  <div className="today-step__content">
                    <div className="today-step__heading"><span className="today-step__number">{String(index + 1).padStart(2, "0")}</span><div><h3>{step.name}</h3>{step.productName ? <button type="button" className="today-step__product" onClick={onOpenProducts}><PackageOpen size={13} /> {step.productName}</button> : <p>{step.categoryName}</p>}</div></div>
                    {step.instructions || step.amountGuidance || step.waitSeconds ? <div className="today-step__details">{step.instructions ? <p>{step.instructions}</p> : null}<div>{step.amountGuidance ? <span><Sparkles size={14} /> {step.amountGuidance}</span> : null}{step.waitSeconds ? <span><Clock3 size={14} /> Wait {step.waitSeconds}s</span> : null}</div></div> : null}
                    <div className="today-step__actions">
                      {resolved ? <button type="button" onClick={() => setStepState(step.id, "pending")}><RotateCcw size={14} /> Undo</button> : <button type="button" onClick={() => setStepState(step.id, "skipped")}><SkipForward size={14} /> Skip</button>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <section className="quick-note-card">
            <div><span className="quick-note-card__icon"><FileText size={20} /></span><div><h2>Notice something?</h2><p>Capture a thought without leaving Today.</p></div></div>
            <Button variant="secondary" onClick={() => setNoteOpen(true)}>Add note</Button>
            {todayNotes.length ? <div className="quick-note-card__latest"><span>{formatClockTime(todayNotes[0].capturedAt)}</span><p>{todayNotes[0].text}</p></div> : null}
          </section>
        </>
      )}
      <Sheet open={noteOpen} title="Quick note" description="Saved with today’s date and time." onClose={() => setNoteOpen(false)} footer={<Button fullWidth onClick={saveNote}>Save note</Button>}>
        <TextAreaField label="What did you notice?" rows={5} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Skin felt comfortable tonight…" />
      </Sheet>
    </div>
  );
}

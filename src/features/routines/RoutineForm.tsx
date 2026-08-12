import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Button } from "@/src/components/common/Button";
import { IconButton } from "@/src/components/common/IconButton";
import { SegmentedControl } from "@/src/components/common/SegmentedControl";
import { Sheet } from "@/src/components/common/Sheet";
import { SelectField, TextAreaField, TextField } from "@/src/components/forms/Field";
import type { ScheduleDraft, StepDraft } from "@/src/repositories/routineRepository";
import type { Category, Product, RoutinePeriod, RoutineWithDetails } from "@/src/types/domain";

export interface RoutineFormValue {
  name: string;
  period: RoutinePeriod;
  notes: string;
  favorite: boolean;
  archived: boolean;
  priority: number;
  steps: StepDraft[];
  schedule: ScheduleDraft;
}

interface RoutineFormProps {
  open: boolean;
  routine?: RoutineWithDetails;
  products: Product[];
  categories: Category[];
  busy?: boolean;
  onClose(): void;
  onSave(value: RoutineFormValue): void | Promise<void>;
}

function emptyStep(order: number, categoryName = "Other"): StepDraft {
  return {
    order,
    name: "",
    categoryName,
    instructions: "",
    amountGuidance: "",
    notes: "",
    required: true,
  };
}

export function RoutineForm({ open, routine, products, categories, busy = false, onClose, onSave }: RoutineFormProps) {
  const requiredId = useId();
  const [name, setName] = useState(routine?.name ?? "");
  const [period, setPeriod] = useState<RoutinePeriod>(routine?.period ?? "pm");
  const [notes, setNotes] = useState(routine?.notes ?? "");
  const [steps, setSteps] = useState<StepDraft[]>(() =>
    routine?.steps.length
      ? routine.steps.map(({ id, routineId, createdAt, updatedAt, ...step }) => {
          void id;
          void routineId;
          void createdAt;
          void updatedAt;
          return step;
        })
      : [emptyStep(0, categories[0]?.name)],
  );
  const [scheduleKind, setScheduleKind] = useState<ScheduleDraft["kind"]>(routine?.schedule?.kind ?? "daily");
  const [weekdays, setWeekdays] = useState<number[]>(routine?.schedule?.weekdays ?? []);
  const [intervalDays, setIntervalDays] = useState(routine?.schedule?.intervalDays ?? 2);
  const [anchorDate, setAnchorDate] = useState(routine?.schedule?.anchorDate ?? new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");

  const activeProducts = useMemo(
    () => products.filter((product) => product.status === "active" || product.status === "unopened"),
    [products],
  );

  function updateStep(index: number, changes: Partial<StepDraft>) {
    setSteps((current) => current.map((step, stepIndex) => stepIndex === index ? { ...step, ...changes } : step));
  }

  function moveStep(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    setSteps((current) => {
      const reordered = [...current];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      return reordered.map((step, order) => ({ ...step, order }));
    });
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, stepIndex) => stepIndex !== index).map((step, order) => ({ ...step, order })));
  }

  function toggleWeekday(day: number) {
    setWeekdays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort());
  }

  async function submit() {
    const cleaned = steps
      .filter((step) => step.name.trim())
      .map((step, order) => ({ ...step, name: step.name.trim(), order }));
    if (!name.trim()) {
      setError("Give this routine a name.");
      return;
    }
    if (!cleaned.length) {
      setError("Add at least one named step.");
      return;
    }
    if (scheduleKind === "weekdays" && !weekdays.length) {
      setError("Choose at least one weekday or use Manual.");
      return;
    }
    setError("");
    await onSave({
      name: name.trim(),
      period,
      notes: notes.trim(),
      favorite: routine?.favorite ?? false,
      archived: false,
      priority: routine?.priority ?? Date.now(),
      steps: cleaned,
      schedule: {
        kind: scheduleKind,
        weekdays: scheduleKind === "weekdays" ? weekdays : [],
        intervalDays: scheduleKind === "interval" ? Math.max(1, intervalDays) : undefined,
        anchorDate: scheduleKind === "interval" ? anchorDate : undefined,
        enabled: true,
      },
    });
  }

  return (
    <Sheet
      open={open}
      size="large"
      title={routine ? "Edit routine" : "New routine"}
      description="Keep it clear enough to follow with one hand."
      onClose={onClose}
      footer={<Button fullWidth onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save routine"}</Button>}
    >
      <div className="form-stack">
        <TextField label="Routine name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Recovery Night" autoComplete="off" />
        <div className="form-section">
          <h3>Time of day</h3>
          <SegmentedControl<RoutinePeriod> value={period} onChange={setPeriod} label="Routine time" segments={[{ value: "am", label: "AM" }, { value: "pm", label: "PM" }, { value: "anytime", label: "Anytime" }]} />
        </div>
        <div className="form-section">
          <div className="form-section__heading"><div><h3>Steps</h3><p>Resolved steps remain visible in Today.</p></div><Button variant="quiet" leadingIcon={<Plus size={17} />} onClick={() => setSteps((current) => [...current, emptyStep(current.length, categories[0]?.name)])}>Add step</Button></div>
          <div className="step-editors">
            {steps.map((step, index) => (
              <article className="step-editor" key={`step-${index}`}>
                <div className="step-editor__top">
                  <span className="step-editor__drag" aria-hidden="true"><GripVertical size={18} /></span>
                  <strong>Step {index + 1}</strong>
                  <div className="step-editor__actions">
                    <IconButton label={`Move step ${index + 1} up`} onClick={() => moveStep(index, -1)} disabled={index === 0}><ChevronUp size={17} /></IconButton>
                    <IconButton label={`Move step ${index + 1} down`} onClick={() => moveStep(index, 1)} disabled={index === steps.length - 1}><ChevronDown size={17} /></IconButton>
                    <IconButton label={`Remove step ${index + 1}`} tone="danger" onClick={() => removeStep(index)} disabled={steps.length === 1}><Trash2 size={17} /></IconButton>
                  </div>
                </div>
                <div className="step-editor__grid">
                  <TextField label="Step name" value={step.name} onChange={(event) => updateStep(index, { name: event.target.value })} placeholder="Apply moisturizer" />
                  <SelectField label="Category" value={step.categoryName} onChange={(event) => updateStep(index, { categoryName: event.target.value })}>
                    {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
                  </SelectField>
                  <SelectField label="Linked product" optional value={step.productId ?? ""} onChange={(event) => {
                    const product = activeProducts.find((item) => item.id === event.target.value);
                    updateStep(index, { productId: product?.id || undefined, categoryName: product?.categoryName ?? step.categoryName });
                  }}>
                    <option value="">No product linked</option>
                    {activeProducts.map((product) => <option key={product.id} value={product.id}>{product.brand ? `${product.brand} — ` : ""}{product.name}</option>)}
                  </SelectField>
                  <TextField label="Amount" optional value={step.amountGuidance} onChange={(event) => updateStep(index, { amountGuidance: event.target.value })} placeholder="2–3 drops" />
                  <TextField label="Wait time" optional type="number" inputMode="numeric" min="0" value={step.waitSeconds ?? ""} onChange={(event) => updateStep(index, { waitSeconds: event.target.value ? Number(event.target.value) : undefined })} hint="Seconds" />
                  <TextAreaField label="Instructions" optional rows={2} value={step.instructions} onChange={(event) => updateStep(index, { instructions: event.target.value })} />
                </div>
                <div className="toggle-row"><label htmlFor={`${requiredId}-${index}`}><strong>Required step</strong><small>Optional steps can still be skipped.</small></label><input id={`${requiredId}-${index}`} type="checkbox" checked={step.required} onChange={(event) => updateStep(index, { required: event.target.checked })} /></div>
              </article>
            ))}
          </div>
        </div>
        <div className="form-section">
          <h3>Schedule</h3>
          <SegmentedControl<ScheduleDraft["kind"]> value={scheduleKind} onChange={setScheduleKind} label="Schedule type" segments={[{ value: "daily", label: "Daily" }, { value: "weekdays", label: "Days" }, { value: "interval", label: "Interval" }, { value: "manual", label: "Manual" }]} />
          {scheduleKind === "weekdays" ? <div className="weekday-picker" aria-label="Schedule weekdays">{["S", "M", "T", "W", "T", "F", "S"].map((label, day) => <button key={`${label}-${day}`} type="button" aria-pressed={weekdays.includes(day)} aria-label={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day]} onClick={() => toggleWeekday(day)}>{label}</button>)}</div> : null}
          {scheduleKind === "interval" ? <div className="field-grid"><TextField label="Every X days" type="number" min="1" inputMode="numeric" value={intervalDays} onChange={(event) => setIntervalDays(Number(event.target.value))} /><TextField label="Starting" type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} /></div> : null}
          {scheduleKind === "manual" ? <p className="form-help">Manual routines never appear automatically, but remain available from Today.</p> : null}
        </div>
        <TextAreaField label="Routine notes" optional rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything you want to remember about this routine." />
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </div>
    </Sheet>
  );
}

import { ArrowRight, Check, CloudOff, Moon, ShieldCheck, SunMedium } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/src/components/common/Button";
import { getDatabase } from "@/src/db/VeilDatabase";
import { ONBOARDING_STORAGE_KEY } from "@/src/lib/constants";
import { RoutineRepository, type StepDraft } from "@/src/repositories/routineRepository";
import type { RoutinePeriod } from "@/src/types/domain";
import { toUserMessage } from "@/src/utils/errors";

type RoutineChoice = "am" | "pm" | "both";

interface OnboardingProps {
  onComplete(): void;
}

const morningSteps: StepDraft[] = [
  { order: 0, name: "Cleanse", categoryName: "Cleanser", instructions: "Use your usual morning cleanser.", amountGuidance: "A small amount", notes: "", required: true },
  { order: 1, name: "Treat", categoryName: "Serum", instructions: "Apply your preferred serum or treatment.", amountGuidance: "2–3 drops", notes: "", required: false },
  { order: 2, name: "Moisturize", categoryName: "Moisturizer", instructions: "Smooth over face and neck.", amountGuidance: "A pea-sized amount", notes: "", required: true },
  { order: 3, name: "Protect", categoryName: "Sunscreen", instructions: "Apply evenly as the final morning step.", amountGuidance: "Two finger lengths", notes: "", required: true },
];

const eveningSteps: StepDraft[] = [
  { order: 0, name: "Cleanse", categoryName: "Cleanser", instructions: "Remove the day gently.", amountGuidance: "A small amount", notes: "", required: true },
  { order: 1, name: "Treat", categoryName: "Treatment", instructions: "Use the treatment planned for tonight.", amountGuidance: "As directed", notes: "", required: false },
  { order: 2, name: "Moisturize", categoryName: "Moisturizer", instructions: "Seal in hydration.", amountGuidance: "A pea-sized amount", notes: "", required: true },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [page, setPage] = useState(0);
  const [choice, setChoice] = useState<RoutineChoice>("both");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pageLabels = useMemo(() => ["Welcome", "Routines", "Ready"], []);

  async function finish() {
    setBusy(true);
    setError("");
    try {
      const repository = new RoutineRepository(getDatabase());
      const periods: Array<Exclude<RoutinePeriod, "anytime">> =
        choice === "both" ? ["am", "pm"] : [choice];
      for (const period of periods) {
        await repository.create(
          {
            name: period === "am" ? "Morning Routine" : "Evening Routine",
            period,
            notes: "",
            favorite: true,
            archived: false,
            priority: period === "am" ? 0 : 1,
          },
          period === "am" ? morningSteps : eveningSteps,
          { kind: "daily", weekdays: [], enabled: true },
        );
      }
      try {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, "complete");
      } catch {
        // The database routines are enough to prevent a blocked first use.
      }
      onComplete();
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  function skip() {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "complete");
    } catch {
      // Onboarding remains skippable even when preference storage is unavailable.
    }
    onComplete();
  }

  return (
    <div className="onboarding" role="dialog" aria-modal="true" aria-label={pageLabels[page]}>
      <div className="onboarding__top">
        <p className="onboarding__brand">VEIL</p>
        <button type="button" className="onboarding__skip" onClick={skip}>Skip</button>
      </div>
      <div className="onboarding__pages">
        {page === 0 ? (
          <section className="onboarding__page">
            <div className="onboarding__hero-mark" aria-hidden="true"><span /></div>
            <p className="onboarding__eyebrow">Private skincare, quietly organized</p>
            <h1>Your routine,<br />ready when you are.</h1>
            <p className="onboarding__copy">Veil keeps each step clear and your skincare history on this device. No account. No feed. No noise.</p>
            <div className="onboarding__trust">
              <span><ShieldCheck size={18} /> Stored locally</span>
              <span><CloudOff size={18} /> Works offline</span>
            </div>
          </section>
        ) : null}
        {page === 1 ? (
          <section className="onboarding__page onboarding__page--choices">
            <p className="onboarding__eyebrow">A simple place to begin</p>
            <h1>Which routines would you like?</h1>
            <p className="onboarding__copy">We’ll create a clean starter structure. Every name, step, and schedule can be changed later.</p>
            <div className="routine-choices" role="radiogroup" aria-label="Starter routines">
              {([
                ["am", "Morning", "A calm start with daily protection", SunMedium],
                ["pm", "Evening", "A gentle close to the day", Moon],
                ["both", "Both", "Morning and evening, ready to refine", Check],
              ] as const).map(([value, label, detail, Icon]) => (
                <button key={value} type="button" role="radio" aria-checked={choice === value} className="routine-choice" onClick={() => setChoice(value)}>
                  <span className="routine-choice__icon"><Icon size={22} /></span>
                  <span><strong>{label}</strong><small>{detail}</small></span>
                  <span className="routine-choice__check"><Check size={15} /></span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
        {page === 2 ? (
          <section className="onboarding__page onboarding__page--ready">
            <div className="onboarding__ready-mark" aria-hidden="true"><Check size={34} /></div>
            <p className="onboarding__eyebrow">Everything stays flexible</p>
            <h1>Your first ritual is ready.</h1>
            <p className="onboarding__copy">Next, Veil will open to Today. Add your own products when it feels useful—your routine works without them.</p>
            <ul className="onboarding__list">
              <li><Check size={17} /> Daily starter routine</li>
              <li><Check size={17} /> AM and PM chosen automatically</li>
              <li><Check size={17} /> Every completion saved to history</li>
            </ul>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
          </section>
        ) : null}
      </div>
      <footer className="onboarding__footer">
        <div className="onboarding__dots" aria-label={`Step ${page + 1} of 3`}>
          {[0, 1, 2].map((dot) => <span key={dot} data-active={dot === page} />)}
        </div>
        {page < 2 ? (
          <Button fullWidth onClick={() => setPage((current) => current + 1)}>
            Continue <ArrowRight size={17} />
          </Button>
        ) : (
          <Button fullWidth onClick={finish} disabled={busy}>{busy ? "Preparing Veil…" : "Open Today"}</Button>
        )}
      </footer>
    </div>
  );
}

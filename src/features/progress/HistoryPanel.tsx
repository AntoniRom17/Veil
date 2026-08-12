import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, Forward, History } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/src/components/common/EmptyState";
import { IconButton } from "@/src/components/common/IconButton";
import { Sheet } from "@/src/components/common/Sheet";
import type { SessionWithSteps } from "@/src/types/domain";
import { formatClockTime, formatShortDate, toLocalDateKey } from "@/src/utils/dates";

export function HistoryPanel({ sessions }: { sessions: SessionWithSteps[] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateKey(new Date()));
  const [detail, setDetail] = useState<SessionWithSteps | null>(null);
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const leading = Array.from({ length: days[0]?.getDay() ?? 0 });
  const sessionDates = new Set(sessions.map((session) => session.localDate));
  const selectedSessions = sessions.filter((session) => session.localDate === selectedDate);

  if (!sessions.length) return <EmptyState icon={<History size={25} />} title="Your history starts here." description="Complete a routine and its saved steps will appear on this calendar." />;

  return (
    <div className="history-panel">
      <section className="calendar-card">
        <header><IconButton label="Previous month" onClick={() => setMonth((value) => subMonths(value, 1))}><ChevronLeft size={18} /></IconButton><h2>{format(month, "MMMM yyyy")}</h2><IconButton label="Next month" onClick={() => setMonth((value) => addMonths(value, 1))}><ChevronRight size={18} /></IconButton></header>
        <div className="calendar-weekdays" aria-hidden="true">{["S", "M", "T", "W", "T", "F", "S"].map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
        <div className="calendar-grid">{leading.map((_, index) => <span key={`blank-${index}`} />)}{days.map((day) => { const key = toLocalDateKey(day); return <button key={key} type="button" aria-pressed={selectedDate === key} data-has-session={sessionDates.has(key)} onClick={() => setSelectedDate(key)}><span>{format(day, "d")}</span></button>; })}</div>
      </section>
      <section className="history-day"><h2>{formatShortDate(selectedDate)}</h2>{selectedSessions.length ? <div className="history-list">{selectedSessions.map((session) => <button type="button" key={session.id} onClick={() => setDetail(session)}><span className={`history-list__period history-list__period--${session.period}`}>{session.period.toUpperCase()}</span><span><strong>{session.routineName}</strong><small><Clock3 size={13} /> {formatClockTime(session.startedAt)} · {session.completedCount} complete{session.skippedCount ? ` · ${session.skippedCount} skipped` : ""}</small></span><ChevronRight size={18} /></button>)}</div> : <p className="history-day__empty">No routine saved on this day.</p>}</section>
      {detail ? <Sheet open title={detail.routineName} description={`${formatShortDate(detail.localDate)} at ${formatClockTime(detail.startedAt)}`} onClose={() => setDetail(null)}><div className="session-detail"><div className="session-detail__summary"><span>{detail.completedCount} complete</span><span>{detail.skippedCount} skipped</span><span>{detail.totalCount} total</span></div><ol>{detail.steps.map((step) => <li key={step.id} data-state={step.state}>{step.state === "complete" ? <CheckCircle2 size={19} /> : step.state === "skipped" ? <Forward size={18} /> : <span className="session-detail__pending" />}<div><strong>{step.name}</strong>{step.productName ? <small>{step.productName}</small> : null}</div></li>)}</ol>{detail.notes ? <div className="detail-section"><h3>Session note</h3><p>{detail.notes}</p></div> : null}</div></Sheet> : null}
    </div>
  );
}

import { Eye, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/src/components/common/Button";
import { EmptyState } from "@/src/components/common/EmptyState";
import { Sheet } from "@/src/components/common/Sheet";
import { SelectField, TextAreaField, TextField } from "@/src/components/forms/Field";
import { ProgressRepository } from "@/src/repositories/progressRepository";
import type { ObservationType, Product, ReactionLog } from "@/src/types/domain";
import { formatShortDate, toLocalDateKey } from "@/src/utils/dates";
import { toUserMessage } from "@/src/utils/errors";

const types: ObservationType[] = ["dryness", "redness", "irritation", "breakout", "stinging", "pilling", "positive", "other"];

export function ObservationsPanel({ logs, products, repository, onMessage }: { logs: ReactionLog[]; products: Product[]; repository: ProgressRepository; onMessage(message: string): void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => toLocalDateKey(new Date()));
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<ObservationType>("dryness");
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await repository.createReaction({ localDate: date, productIds: productId ? [productId] : [], observationType: type, severity, notes });
      setOpen(false); setNotes(""); setProductId("");
      onMessage("Observation saved without assigning causation.");
    } catch (error) { onMessage(toUserMessage(error)); }
    finally { setBusy(false); }
  }

  return <div className="progress-panel">{logs.length ? <div className="observation-list">{logs.map((log) => <article key={log.id}><div><span>{log.observationType}</span><small>{formatShortDate(log.localDate)} · Severity {log.severity}/5</small></div><p>{log.notes}</p>{log.productIds.length ? <small>Products used around this entry: {log.productIds.map((id) => products.find((product) => product.id === id)?.name ?? "Removed product").join(", ")}</small> : null}</article>)}</div> : <EmptyState compact icon={<Eye size={25} />} title="Nothing observed yet." description="Log a personal observation without implying that a product caused it." />}<Button fullWidth leadingIcon={<Plus size={18} />} onClick={() => setOpen(true)}>Log observation</Button><Sheet open={open} title="New observation" description="Veil records context, not medical causation." onClose={() => setOpen(false)} footer={<Button fullWidth onClick={save} disabled={busy}>{busy ? "Saving…" : "Save observation"}</Button>}><div className="form-stack"><div className="field-grid"><TextField label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /><SelectField label="Observation" value={type} onChange={(event) => setType(event.target.value as ObservationType)}>{types.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</SelectField></div><SelectField label="Products used around this entry" optional value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">None selected</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</SelectField><div className="form-section"><h3>Severity</h3><div className="severity-picker" role="radiogroup" aria-label="Observation severity">{([1, 2, 3, 4, 5] as const).map((value) => <button type="button" key={value} role="radio" aria-checked={severity === value} onClick={() => setSeverity(value)}>{value}</button>)}</div></div><TextAreaField label="What did you notice?" rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} /></div></Sheet></div>;
}

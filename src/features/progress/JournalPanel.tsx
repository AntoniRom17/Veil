import { BookOpenText, Camera, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/src/components/common/Button";
import { EmptyState } from "@/src/components/common/EmptyState";
import { Sheet } from "@/src/components/common/Sheet";
import { SelectField, TextAreaField, TextField } from "@/src/components/forms/Field";
import { useObjectUrl } from "@/src/hooks/useObjectUrl";
import { MediaRepository } from "@/src/repositories/mediaRepository";
import { ProgressRepository } from "@/src/repositories/progressRepository";
import { processImage } from "@/src/services/imageService";
import type { JournalEntry, MediaAsset, Product, SkinFeel } from "@/src/types/domain";
import { formatShortDate, toLocalDateKey } from "@/src/utils/dates";
import { toUserMessage } from "@/src/utils/errors";

function JournalPhoto({ media }: { media?: MediaAsset }) {
  const url = useObjectUrl(media?.thumbnail);
  return url ? <img src={url} alt="Journal entry" /> : null;
}

export function JournalPanel({ entries, products, progressRepository, mediaRepository, mediaById, onMessage }: { entries: JournalEntry[]; products: Product[]; progressRepository: ProgressRepository; mediaRepository: MediaRepository; mediaById: Map<string, MediaAsset>; onMessage(message: string): void }) {
  const photoId = useId();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [skinFeel, setSkinFeel] = useState<SkinFeel>("balanced");
  const [date, setDate] = useState(() => toLocalDateKey(new Date()));
  const [tags, setTags] = useState("");
  const [productId, setProductId] = useState("");
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    let mediaId: string | undefined;
    try {
      if (file) mediaId = (await mediaRepository.create("journal", await processImage(file))).id;
      await progressRepository.createJournal({ localDate: date, title, notes, skinFeel, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean), photoIds: mediaId ? [mediaId] : [], productIds: productId ? [productId] : [] });
      setOpen(false); setTitle(""); setNotes(""); setTags(""); setProductId(""); setFile(undefined);
      onMessage("Journal entry saved.");
    } catch (error) {
      if (mediaId) await mediaRepository.remove(mediaId).catch(() => undefined);
      onMessage(toUserMessage(error));
    } finally { setBusy(false); }
  }

  return <div className="progress-panel">{entries.length ? <div className="journal-list">{entries.map((entry) => <article key={entry.id}>{entry.photoIds[0] ? <JournalPhoto media={mediaById.get(entry.photoIds[0])} /> : null}<div className="journal-list__body"><span>{formatShortDate(entry.localDate)} · {entry.skinFeel}</span><h2>{entry.title}</h2>{entry.notes ? <p>{entry.notes}</p> : null}{entry.tags.length ? <div>{entry.tags.map((tag) => <small key={tag}>#{tag}</small>)}</div> : null}</div></article>)}</div> : <EmptyState compact icon={<BookOpenText size={25} />} title="A quiet place to notice." description="Write down how your skin felt, what you used, or anything worth remembering." />}<Button fullWidth leadingIcon={<Plus size={18} />} onClick={() => setOpen(true)}>New journal entry</Button><Sheet open={open} size="large" title="Journal entry" description="A personal observation—not a diagnosis." onClose={() => setOpen(false)} footer={<Button fullWidth onClick={save} disabled={busy}>{busy ? "Saving…" : "Save entry"}</Button>}><div className="form-stack"><div className="field-grid"><TextField label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /><SelectField label="Skin felt" value={skinFeel} onChange={(event) => setSkinFeel(event.target.value as SkinFeel)}>{["calm", "balanced", "dry", "oily", "sensitive"].map((feel) => <option key={feel} value={feel}>{feel[0].toUpperCase() + feel.slice(1)}</option>)}</SelectField></div><TextField label="Title" optional value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Evening check-in" /><TextAreaField label="Notes" rows={6} value={notes} onChange={(event) => setNotes(event.target.value)} /><SelectField label="Products used around this entry" optional value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">None selected</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</SelectField><TextField label="Tags" optional value={tags} onChange={(event) => setTags(event.target.value)} hint="Comma separated" /><div className="file-picker"><label htmlFor={photoId}><Camera size={18} /> {file ? file.name : "Add a local photo"}</label><input id={photoId} type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0])} /></div></div></Sheet></div>;
}

import { Camera, Columns2, ImagePlus, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/src/components/common/Button";
import { EmptyState } from "@/src/components/common/EmptyState";
import { Sheet } from "@/src/components/common/Sheet";
import { TextAreaField, TextField } from "@/src/components/forms/Field";
import { useObjectUrl } from "@/src/hooks/useObjectUrl";
import { MediaRepository } from "@/src/repositories/mediaRepository";
import { ProgressRepository } from "@/src/repositories/progressRepository";
import { processImage } from "@/src/services/imageService";
import type { MediaAsset, ProgressPhoto } from "@/src/types/domain";
import { formatShortDate, toLocalDateKey } from "@/src/utils/dates";
import { toUserMessage } from "@/src/utils/errors";

function PhotoImage({ media, alt, full = false }: { media?: MediaAsset; alt: string; full?: boolean }) {
  const url = useObjectUrl(media ? (full ? media.blob : media.thumbnail) : undefined);
  return url ? <img src={url} alt={alt} /> : <span className="photo-placeholder"><ImagePlus size={24} /></span>;
}

export function PhotosPanel({ photos, mediaById, progressRepository, mediaRepository, onMessage }: { photos: ProgressPhoto[]; mediaById: Map<string, MediaAsset>; progressRepository: ProgressRepository; mediaRepository: MediaRepository; onMessage(message: string): void }) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [date, setDate] = useState(() => toLocalDateKey(new Date()));
  const [area, setArea] = useState("Face");
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const comparison = photos.length >= 2 ? [photos[photos.length - 1], photos[0]] : [];

  async function save() {
    if (!file) { onMessage("Choose a progress photo first."); return; }
    setBusy(true);
    let mediaId: string | undefined;
    try {
      mediaId = (await mediaRepository.create("progress", await processImage(file))).id;
      await progressRepository.createPhoto({ localDate: date, mediaId, area, caption, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean) });
      setOpen(false); setFile(undefined); setCaption(""); setTags("");
      onMessage("Progress photo saved locally.");
    } catch (error) {
      if (mediaId) await mediaRepository.remove(mediaId).catch(() => undefined);
      onMessage(toUserMessage(error));
    } finally { setBusy(false); }
  }

  return <div className="progress-panel">{photos.length ? <><div className="photo-toolbar">{photos.length >= 2 ? <Button variant="secondary" leadingIcon={<Columns2 size={18} />} onClick={() => setCompareOpen(true)}>Compare</Button> : <span />}<Button leadingIcon={<Plus size={18} />} onClick={() => setOpen(true)}>Add photo</Button></div><div className="photo-grid">{photos.map((photo) => <figure key={photo.id}><PhotoImage media={mediaById.get(photo.mediaId)} alt={`${photo.area} progress from ${formatShortDate(photo.localDate)}`} /><figcaption><strong>{photo.area}</strong><span>{formatShortDate(photo.localDate)}</span>{photo.caption ? <p>{photo.caption}</p> : null}</figcaption></figure>)}</div></> : <><EmptyState compact icon={<Camera size={25} />} title="Add your first photo when you’re ready." description="Progress photos stay on this device and are never analyzed by Veil." /><Button fullWidth leadingIcon={<Plus size={18} />} onClick={() => setOpen(true)}>Add progress photo</Button></>}<Sheet open={open} title="Progress photo" description="Choose consistent lighting and framing when practical." onClose={() => setOpen(false)} footer={<Button fullWidth onClick={save} disabled={busy}>{busy ? "Processing…" : "Save photo"}</Button>}><div className="form-stack"><div className="file-picker file-picker--large"><label htmlFor={inputId}><Camera size={22} /> {file ? file.name : "Choose photo"}</label><input id={inputId} type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0])} /></div><div className="field-grid"><TextField label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /><TextField label="Area" value={area} onChange={(event) => setArea(event.target.value)} placeholder="Face" /></div><TextAreaField label="Caption" optional rows={3} value={caption} onChange={(event) => setCaption(event.target.value)} /><TextField label="Tags" optional value={tags} onChange={(event) => setTags(event.target.value)} hint="Comma separated" /></div></Sheet>{comparison.length ? <Sheet open={compareOpen} title="Photo comparison" description="Side by side, without scoring or analysis." onClose={() => setCompareOpen(false)} size="large"><div className="comparison"><figure><span>Before</span><PhotoImage full media={mediaById.get(comparison[0].mediaId)} alt={`Before from ${formatShortDate(comparison[0].localDate)}`} /><figcaption>{formatShortDate(comparison[0].localDate)}</figcaption></figure><figure><span>After</span><PhotoImage full media={mediaById.get(comparison[1].mediaId)} alt={`After from ${formatShortDate(comparison[1].localDate)}`} /><figcaption>{formatShortDate(comparison[1].localDate)}</figcaption></figure></div></Sheet> : null}</div>;
}

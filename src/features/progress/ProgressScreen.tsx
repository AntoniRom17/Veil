import { BookOpenText, Camera, Eye, History } from "lucide-react";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { SegmentedControl } from "@/src/components/common/SegmentedControl";
import { ScreenHeader } from "@/src/components/navigation/ScreenHeader";
import { getDatabase } from "@/src/db/VeilDatabase";
import { MediaRepository } from "@/src/repositories/mediaRepository";
import { ProgressRepository } from "@/src/repositories/progressRepository";
import { SessionRepository } from "@/src/repositories/sessionRepository";
import type { MediaAsset } from "@/src/types/domain";
import { HistoryPanel } from "./HistoryPanel";
import { JournalPanel } from "./JournalPanel";
import { ObservationsPanel } from "./ObservationsPanel";
import { PhotosPanel } from "./PhotosPanel";

type ProgressView = "history" | "journal" | "photos" | "observations";

export function ProgressScreen() {
  const db = getDatabase();
  const progressRepository = useMemo(() => new ProgressRepository(db), [db]);
  const sessionRepository = useMemo(() => new SessionRepository(db), [db]);
  const mediaRepository = useMemo(() => new MediaRepository(db), [db]);
  const sessions = useLiveQuery(() => sessionRepository.list(), [sessionRepository], []);
  const entries = useLiveQuery(() => progressRepository.listJournal(), [progressRepository], []);
  const photos = useLiveQuery(() => progressRepository.listPhotos(), [progressRepository], []);
  const observations = useLiveQuery(() => progressRepository.listReactions(), [progressRepository], []);
  const products = useLiveQuery(() => db.products.toArray(), [db], []);
  const media = useLiveQuery(() => db.media.toArray(), [db], []);
  const mediaById = useMemo(() => new Map<string, MediaAsset>(media.map((asset) => [asset.id, asset])), [media]);
  const [view, setView] = useState<ProgressView>("history");
  const [message, setMessage] = useState("");

  return (
    <div className="screen">
      <ScreenHeader eyebrow="A gentler record" title="Progress" description="Notice patterns over time, without turning skincare into a score." />
      {message ? <div className="status-banner" role="status"><span>{message}</span><button type="button" onClick={() => setMessage("")}>Dismiss</button></div> : null}
      <SegmentedControl<ProgressView> value={view} onChange={setView} label="Progress section" segments={[{ value: "history", label: "History" }, { value: "journal", label: "Journal" }, { value: "photos", label: "Photos" }, { value: "observations", label: "Notes" }]} />
      <div className="progress-view-heading">{view === "history" ? <History size={18} /> : view === "journal" ? <BookOpenText size={18} /> : view === "photos" ? <Camera size={18} /> : <Eye size={18} />}<span>{view === "history" ? "Routine history" : view === "journal" ? "Skin journal" : view === "photos" ? "Photo timeline" : "Observations"}</span></div>
      {view === "history" ? <HistoryPanel sessions={sessions} /> : null}
      {view === "journal" ? <JournalPanel entries={entries} products={products} progressRepository={progressRepository} mediaRepository={mediaRepository} mediaById={mediaById} onMessage={setMessage} /> : null}
      {view === "photos" ? <PhotosPanel photos={photos} mediaById={mediaById} progressRepository={progressRepository} mediaRepository={mediaRepository} onMessage={setMessage} /> : null}
      {view === "observations" ? <ObservationsPanel logs={observations} products={products} repository={progressRepository} onMessage={setMessage} /> : null}
    </div>
  );
}

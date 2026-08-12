import { AlertTriangle, ArchiveRestore, ChevronRight, Clock3, Database, Download, HardDrive, Heart, Info, LockKeyhole, Moon, Search, ShieldCheck, Smartphone, SunMedium, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/src/components/common/Button";
import { ConfirmDialog } from "@/src/components/common/ConfirmDialog";
import { SegmentedControl } from "@/src/components/common/SegmentedControl";
import { Sheet } from "@/src/components/common/Sheet";
import { SelectField, TextAreaField, TextField } from "@/src/components/forms/Field";
import { ScreenHeader } from "@/src/components/navigation/ScreenHeader";
import { getDatabase } from "@/src/db/VeilDatabase";
import { useTheme } from "@/src/hooks/useTheme";
import type { PrimaryView } from "@/src/hooks/useViewRouter";
import { APP_VERSION, ONBOARDING_STORAGE_KEY, THEME_OPTIONS } from "@/src/lib/constants";
import { IncompatibilityRepository } from "@/src/repositories/incompatibilityRepository";
import { PreferencesRepository } from "@/src/repositories/preferencesRepository";
import { createBackup, downloadBackup, restoreBackup, validateBackup, type RestoreMode, type ValidatedBackup } from "@/src/services/backupService";
import { searchVeil } from "@/src/services/searchService";
import { formatBytes, getStorageSummary } from "@/src/services/storageService";
import type { ThemePreference } from "@/src/types/domain";
import { formatShortDate } from "@/src/utils/dates";
import { toUserMessage } from "@/src/utils/errors";

type MoreSheet = "search" | "routine" | "compatibility" | "storage" | "install" | "privacy" | "about" | null;

function SettingsRow({ icon, title, detail, onClick, danger = false }: { icon: ReactNode; title: string; detail?: string; onClick(): void; danger?: boolean }) {
  return <button type="button" className={`settings-row${danger ? " settings-row--danger" : ""}`} onClick={onClick}><span className="settings-row__icon">{icon}</span><span><strong>{title}</strong>{detail ? <small>{detail}</small> : null}</span><ChevronRight size={18} /></button>;
}

export function MoreScreen({ onNavigate }: { onNavigate(view: PrimaryView): void }) {
  const db = getDatabase();
  const preferencesRepository = useMemo(() => new PreferencesRepository(db), [db]);
  const incompatibilityRepository = useMemo(() => new IncompatibilityRepository(db), [db]);
  const preferences = useLiveQuery(() => preferencesRepository.get(), [preferencesRepository]);
  const products = useLiveQuery(() => db.products.toArray(), [db], []);
  const routines = useLiveQuery(() => db.routines.toArray(), [db], []);
  const rules = useLiveQuery(() => incompatibilityRepository.list(), [incompatibilityRepository], []);
  const storage = useLiveQuery(() => getStorageSummary(db), [db]);
  const { theme, setTheme } = useTheme();
  const [sheet, setSheet] = useState<MoreSheet>(null);
  const [query, setQuery] = useState("");
  const searchResults = useLiveQuery(() => searchVeil(db, query), [db, query], []);
  const [morningStart, setMorningStart] = useState("");
  const [eveningStart, setEveningStart] = useState("");
  const [leftProduct, setLeftProduct] = useState("");
  const [rightProduct, setRightProduct] = useState("");
  const [ruleNote, setRuleNote] = useState("");
  const [backup, setBackup] = useState<ValidatedBackup>();
  const [restoreMode, setRestoreMode] = useState<RestoreMode>("merge");
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearText, setClearText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const favorites = [...products.filter((product) => product.favorite).map((product) => ({ id: product.id, name: product.name, kind: "Product" })), ...routines.filter((routine) => routine.favorite).map((routine) => ({ id: routine.id, name: routine.name, kind: "Routine" }))];

  function openRoutineSettings() {
    setMorningStart(preferences?.morningStart ?? "05:00");
    setEveningStart(preferences?.eveningStart ?? "17:00");
    setSheet("routine");
  }

  async function saveRoutineSettings() {
    try {
      await preferencesRepository.update({ morningStart, eveningStart });
      setSheet(null); setMessage("Routine timing saved.");
    } catch (error) { setMessage(toUserMessage(error)); }
  }

  async function addRule() {
    try {
      await incompatibilityRepository.create(leftProduct, rightProduct, ruleNote);
      setLeftProduct(""); setRightProduct(""); setRuleNote("");
      setMessage("Personal compatibility reminder saved.");
    } catch (error) { setMessage(toUserMessage(error)); }
  }

  async function exportData() {
    setBusy(true);
    try { downloadBackup(await createBackup(db)); setMessage("Backup prepared for download."); }
    catch (error) { setMessage(toUserMessage(error)); }
    finally { setBusy(false); }
  }

  async function chooseBackup(file?: File) {
    if (!file) return;
    setBusy(true); setBackup(undefined);
    try { setBackup(await validateBackup(file)); setMessage("Backup validated. Review it before importing."); }
    catch (error) { setMessage(toUserMessage(error)); }
    finally { setBusy(false); }
  }

  async function importData() {
    if (!backup) return;
    setBusy(true);
    try {
      const result = await restoreBackup(db, backup, restoreMode);
      setRestoreConfirm(false); setBackup(undefined);
      setMessage(`Imported ${result.importedRecords} records${result.skippedCollisions ? ` · skipped ${result.skippedCollisions} existing IDs` : ""}.`);
    } catch (error) { setMessage(toUserMessage(error)); }
    finally { setBusy(false); }
  }

  async function clearAll() {
    if (clearText !== "VEIL") return;
    setBusy(true);
    try {
      try { localStorage.removeItem(ONBOARDING_STORAGE_KEY); } catch { /* reload still opens an empty app */ }
      await db.delete();
      window.location.reload();
    } catch (error) { setBusy(false); setMessage(toUserMessage(error)); }
  }

  function openResult(kind: string) {
    setSheet(null);
    onNavigate(kind === "product" ? "products" : kind === "routine" ? "routines" : "progress");
  }

  return (
    <div className="screen">
      <ScreenHeader eyebrow="Veil is yours" title="More" description="Appearance, routine timing, backups, and privacy." action={<button type="button" className="more-search" aria-label="Search Veil" onClick={() => setSheet("search")}><Search size={20} /></button>} />
      {message ? <div className="status-banner" role="status"><span>{message}</span><button type="button" onClick={() => setMessage("")}>Dismiss</button></div> : null}
      <section className="privacy-card"><span className="privacy-card__icon" aria-hidden="true"><LockKeyhole size={23} /></span><div><h2>Private by default</h2><p>Your routines and photos stay in this browser unless you intentionally export them.</p></div></section>
      {favorites.length ? <section className="settings-section favorites-section"><h2>Favorites</h2><div>{favorites.slice(0, 4).map((favorite) => <button type="button" key={`${favorite.kind}-${favorite.id}`} onClick={() => onNavigate(favorite.kind === "Product" ? "products" : "routines")}><Heart size={15} fill="currentColor" /><span><strong>{favorite.name}</strong><small>{favorite.kind}</small></span></button>)}</div></section> : null}
      <section className="settings-section"><h2>Appearance</h2><div className="settings-card"><div className="appearance-setting"><span className="settings-row__icon">{theme === "dark" ? <Moon size={19} /> : <SunMedium size={19} />}</span><div><strong>Theme</strong><small>Use Veil comfortably in any light.</small></div></div><SegmentedControl<ThemePreference> value={theme} onChange={setTheme} label="Appearance theme" segments={THEME_OPTIONS} /></div></section>
      <section className="settings-section"><h2>Routine</h2><div className="settings-card"><SettingsRow icon={<Clock3 size={19} />} title="Morning & evening" detail={`${preferences?.morningStart ?? "05:00"} · ${preferences?.eveningStart ?? "17:00"}`} onClick={openRoutineSettings} /><SettingsRow icon={<AlertTriangle size={19} />} title="Personal compatibility reminders" detail={`${rules.length} saved`} onClick={() => setSheet("compatibility")} /></div></section>
      <section className="settings-section"><h2>Data & storage</h2><div className="settings-card"><SettingsRow icon={<Database size={19} />} title="Backup & restore" detail="ZIP backup with local photos" onClick={() => setSheet("storage")} /><SettingsRow icon={<HardDrive size={19} />} title="Storage usage" detail={storage ? `${formatBytes(storage.usageBytes)} used · ${storage.recordCount} records` : "Calculating…"} onClick={() => setSheet("storage")} /></div></section>
      <section className="settings-section"><h2>Veil</h2><div className="settings-card"><SettingsRow icon={<Smartphone size={19} />} title="Add to iPhone Home Screen" detail="Installation instructions" onClick={() => setSheet("install")} /><SettingsRow icon={<ShieldCheck size={19} />} title="Privacy" detail="How local storage works" onClick={() => setSheet("privacy")} /><SettingsRow icon={<Info size={19} />} title="About Veil" detail={`Version ${APP_VERSION}`} onClick={() => setSheet("about")} /></div></section>

      <Sheet open={sheet === "search"} title="Search Veil" description="Products, routines, ingredients, notes, and journal entries." onClose={() => setSheet(null)} size="large"><label className="search-field search-field--sheet"><Search size={18} /><span className="sr-only">Search all Veil data</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search everything" /></label>{query && !searchResults.length ? <p className="sheet-empty">No results for “{query}”.</p> : <div className="search-results">{searchResults.map((result) => <button type="button" key={`${result.kind}-${result.id}`} onClick={() => openResult(result.kind)}><span className="search-results__kind">{result.kind}</span><span><strong>{result.title}</strong><small>{result.subtitle}</small></span><ChevronRight size={17} /></button>)}</div>}</Sheet>
      <Sheet open={sheet === "routine"} title="Routine timing" description="Veil uses these boundaries to choose AM or PM. You can always switch manually." onClose={() => setSheet(null)} footer={<Button fullWidth onClick={saveRoutineSettings}>Save timing</Button>}><div className="form-stack"><TextField label="Morning begins" type="time" value={morningStart} onChange={(event) => setMorningStart(event.target.value)} /><TextField label="Evening begins" type="time" value={eveningStart} onChange={(event) => setEveningStart(event.target.value)} /></div></Sheet>
      <Sheet open={sheet === "compatibility"} title="Personal reminders" description="These are your own organizational rules. Veil does not determine medical compatibility." onClose={() => setSheet(null)} size="large"><div className="form-stack"><div className="field-grid"><SelectField label="First product" value={leftProduct} onChange={(event) => setLeftProduct(event.target.value)}><option value="">Choose product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</SelectField><SelectField label="Second product" value={rightProduct} onChange={(event) => setRightProduct(event.target.value)}><option value="">Choose product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</SelectField></div><TextAreaField label="Reminder" optional rows={3} value={ruleNote} onChange={(event) => setRuleNote(event.target.value)} placeholder="My own reason for keeping these apart" /><Button onClick={addRule}>Add reminder</Button>{rules.length ? <div className="rule-list">{rules.map((rule) => <div key={rule.id}><span><strong>{products.find((product) => product.id === rule.leftId)?.name ?? "Removed product"} + {products.find((product) => product.id === rule.rightId)?.name ?? "Removed product"}</strong>{rule.note ? <small>{rule.note}</small> : null}</span><button type="button" aria-label="Remove reminder" onClick={() => incompatibilityRepository.remove(rule.id)}><Trash2 size={17} /></button></div>)}</div> : null}</div></Sheet>
      <Sheet open={sheet === "storage"} title="Data & storage" description="Backups are the only way Veil data leaves this browser." onClose={() => { setSheet(null); setBackup(undefined); }} size="large"><div className="storage-summary"><div><strong>{formatBytes(storage?.usageBytes)}</strong><span>Browser usage</span></div><div><strong>{formatBytes(storage?.mediaBytes)}</strong><span>Veil images</span></div><div><strong>{storage?.recordCount ?? 0}</strong><span>Records</span></div><div><strong>{storage?.sessionCount ?? 0}</strong><span>Sessions</span></div></div><div className="data-actions"><Button fullWidth leadingIcon={<Download size={18} />} onClick={exportData} disabled={busy}>{busy ? "Preparing…" : "Export backup"}</Button><label className="button button--secondary button--full"><Upload size={18} /> Choose backup<input type="file" accept=".zip,application/zip" onChange={(event) => chooseBackup(event.target.files?.[0])} /></label></div>{backup ? <section className="backup-review"><h3>Validated Veil backup</h3><p>Created {formatShortDate(new Date(backup.metadata.createdAt))} with Veil {backup.metadata.applicationVersion}.</p><div><span>{backup.counts.products} products</span><span>{backup.counts.routines} routines</span><span>{backup.counts.sessions} sessions</span><span>{backup.counts.photos} photos</span></div><SegmentedControl<RestoreMode> value={restoreMode} onChange={setRestoreMode} label="Import mode" segments={[{ value: "merge", label: "Merge safely" }, { value: "replace", label: "Replace existing" }]} /><p className="neutral-notice">{restoreMode === "merge" ? "Existing IDs are kept; colliding imported records are skipped." : "All current Veil records will be removed inside the restore transaction."}</p><Button fullWidth variant={restoreMode === "replace" ? "danger" : "primary"} leadingIcon={<ArchiveRestore size={18} />} onClick={() => setRestoreConfirm(true)}>Import backup</Button></section> : null}<button type="button" className="clear-data-row" onClick={() => setClearOpen(true)}><Trash2 size={18} /><span><strong>Clear all Veil data</strong><small>Requires typing VEIL to confirm</small></span></button></Sheet>
      <Sheet open={sheet === "install"} title="Add Veil to iPhone" description="Use Safari for the full standalone experience." onClose={() => setSheet(null)}><ol className="install-steps"><li><span>1</span>Open Veil in Safari.</li><li><span>2</span>Tap the Share button.</li><li><span>3</span>Choose Add to Home Screen.</li><li><span>4</span>Tap Add.</li></ol><p className="neutral-notice">After one successful load, the core app is available offline. iOS may still manage browser storage under device pressure, so keep a recent backup.</p></Sheet>
      <Sheet open={sheet === "privacy"} title="Privacy" onClose={() => setSheet(null)}><div className="privacy-copy"><h3>Local-first, without an account</h3><p>Veil stores routines, products, history, notes, and compressed photos in this browser’s IndexedDB. Theme and first-launch preferences use small local settings.</p><h3>No Veil cloud</h3><p>Veil has no account system and does not upload skincare data to a Veil server. Data leaves the device only when you intentionally export, share, or move a backup.</p><h3>Browser storage has limits</h3><p>Private browsing, clearing Safari data, uninstalling the PWA, device storage pressure, or browser policies can remove local data. Export backups regularly.</p></div></Sheet>
      <Sheet open={sheet === "about"} title="About Veil" onClose={() => setSheet(null)}><div className="about-veil"><div className="veil-mark"><span /></div><h2>Veil</h2><p>Your skincare routine, organized.</p><small>Version {APP_VERSION}</small><p className="neutral-notice">Veil is an organizational and personal tracking app. It does not provide diagnosis, treatment recommendations, or product safety assessments.</p></div></Sheet>
      <ConfirmDialog open={restoreConfirm} title={restoreMode === "replace" ? "Replace current Veil data?" : "Merge this backup?"} description={restoreMode === "replace" ? "Current products, routines, history, notes, and photos will be replaced by the validated backup. This cannot be undone without another backup." : "New backup records will be added. Existing records with the same ID will remain unchanged."} confirmLabel={restoreMode === "replace" ? "Replace data" : "Merge backup"} onClose={() => setRestoreConfirm(false)} onConfirm={importData} busy={busy} />
      <Sheet open={clearOpen} title="Clear all Veil data" description="This removes every local product, routine, session, note, photo, observation, and preference." onClose={() => setClearOpen(false)} footer={<Button fullWidth variant="danger" onClick={clearAll} disabled={clearText !== "VEIL" || busy}>{busy ? "Clearing…" : "Permanently clear data"}</Button>}><div className="confirmation-copy"><span className="confirmation-copy__icon"><AlertTriangle size={24} /></span><p>Export a backup first if you may want this data again. Type <strong>VEIL</strong> below to continue.</p></div><TextField label="Confirmation" value={clearText} onChange={(event) => setClearText(event.target.value)} autoComplete="off" /></Sheet>
    </div>
  );
}

import { LockKeyhole } from "lucide-react";
import { ScreenHeader } from "@/src/components/navigation/ScreenHeader";

export function MoreScreen() {
  return (
    <div className="screen">
      <ScreenHeader eyebrow="Veil is yours" title="More" description="Appearance, routine timing, backups, and privacy." />
      <section className="privacy-card">
        <span className="privacy-card__icon" aria-hidden="true"><LockKeyhole size={23} /></span>
        <div>
          <h2>Private by default</h2>
          <p>Your routines and photos stay in this browser unless you intentionally export them.</p>
        </div>
      </section>
    </div>
  );
}

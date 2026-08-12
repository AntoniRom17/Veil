import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconButton } from "./IconButton";

interface SheetProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose(): void;
  footer?: ReactNode;
  size?: "default" | "large";
}

export function Sheet({
  open,
  title,
  description,
  children,
  onClose,
  footer,
  size = "default",
}: SheetProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => panelRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("sheet-open");
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("sheet-open");
      previousFocus.current?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="sheet-layer" role="presentation">
      <button className="sheet-backdrop" type="button" aria-label="Close" onClick={onClose} />
      <div
        ref={panelRef}
        className={`sheet sheet--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <div className="sheet__handle" aria-hidden="true" />
        <header className="sheet__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={20} strokeWidth={1.9} />
          </IconButton>
        </header>
        <div className="sheet__body">{children}</div>
        {footer ? <footer className="sheet__footer">{footer}</footer> : null}
      </div>
    </div>
  );
}

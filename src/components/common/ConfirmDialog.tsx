import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { Sheet } from "./Sheet";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm(): void | Promise<void>;
  onClose(): void;
  busy?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  busy = false,
}: ConfirmDialogProps) {
  return (
    <Sheet
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <div className="button-row">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" fullWidth onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="confirmation-copy">
        <span className="confirmation-copy__icon" aria-hidden="true">
          <AlertTriangle size={24} />
        </span>
        <p>{description}</p>
      </div>
    </Sheet>
  );
}
